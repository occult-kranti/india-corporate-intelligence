#!/usr/bin/env python3
"""Pinned local multilingual encoders; small explicit LoRA updates only."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
from urllib.request import urlopen

os.environ.setdefault('HF_HUB_OFFLINE', '1')
os.environ.setdefault('TRANSFORMERS_OFFLINE', '1')
os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')

import torch
from torch import nn
from transformers import AutoModel, AutoTokenizer

CACHE_ROOT = Path('/workspace/.cache/icip-next-models')
MODELS = {
    'e5': {
        'modelId': 'intfloat/multilingual-e5-small',
        'revision': '614241f622f53c4eeff9890bdc4f31cfecc418b3', 'license': 'MIT',
        'pooling': 'attention-mask mean, L2 normalized', 'dimensions': 384,
        'expectedTrainableParameters': 147456,
        'assets': {
            'README.md': ('0038de97aee16258cecbad7ffda4b4febd6953e747a00e0ddbc8e6ed241e9c1c', 497538),
            'config.json': ('69137736cab8b8903a07fe8afaafdda25aac55415a12a55d1bffa9f581abf959', 655),
            'model.safetensors': ('1a55775f53449dac10a2bcbc312469fac40b96d53198c407081a831f81c98477', 470641600),
            'special_tokens_map.json': ('d05497f1da52c5e09554c0cd874037a083e1dc1b9cfd48034d1c717f1afc07a7', 167),
            'tokenizer.json': ('0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39', 17082730),
            'tokenizer_config.json': ('a1d6bc8734a6f635dc158508bef000f8e2e5a759c7d92f984b2c86e5ff53425b', 443),
        },
    },
    'f2': {
        'modelId': 'codefuse-ai/F2LLM-v2-80M',
        'revision': 'ad88d7a126711f1490cd4bad645dc9d3acc2af6a', 'license': 'Apache-2.0',
        'pooling': 'last actual EOS hidden state, L2 normalized', 'dimensions': 320,
        'expectedTrainableParameters': 237568,
        'assets': {
            'README.md': ('1b3fc060474405651dc6f39a3f93dbd1ad01f6e84784bae148d144786014a711', 8797),
            'config.json': ('6adc1b382b3aed8453ae99665c01713189737936a3caf2638cb9083c97fd7013', 941),
            'config_sentence_transformers.json': ('0d68b69297f1e04931794d6a0240334fc5fd3d6f0560b5bd904231864cd0aa7d', 224),
            'model.safetensors': ('2177fbd79bd6259904a54514e0e313efd28704acd98bfe276a06b2c638f2e4c1', 160178064),
            'special_tokens_map.json': ('76862e765266b85aa9459767e33cbaf13970f327a0e88d1c65846c2ddd3a1ecd', 613),
            'tokenizer.json': ('7e295e5bb91a3d35335f92fa4294a6e4e0ab4aa586db853e14312a62135bfddc', 8399930),
            'tokenizer_config.json': ('3c0884a30471f4f542dc89630f62a380bb70a341fafda826136a7be921fec7ea', 9762),
        },
    },
}
QUERY_INSTRUCTION = 'Instruct: Given a question, retrieve passages that can help answer the question.\nQuery: '


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def prepare(family, cache_root=CACHE_ROOT, offline=True):
    specification = MODELS[family]
    cache = Path(cache_root) / specification['revision']
    cache.mkdir(parents=True, exist_ok=True)
    records = []
    for name, (expected, size) in specification['assets'].items():
        path = cache / name
        url = f'https://huggingface.co/{specification["modelId"]}/resolve/{specification["revision"]}/{name}'
        if not path.exists():
            if offline:
                raise ValueError(f'Missing pinned offline asset: {path}')
            temporary = path.with_suffix(path.suffix + '.partial')
            print(f'Downloading {family}/{name}: {size:,} bytes', flush=True)
            with urlopen(url, timeout=60) as response, temporary.open('wb') as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            if temporary.stat().st_size != size or sha(temporary) != expected:
                temporary.unlink()
                raise ValueError(f'Pinned asset verification failed: {family}/{name}')
            temporary.replace(path)
        if path.stat().st_size != size or sha(path) != expected:
            raise ValueError(f'Cached asset verification failed: {family}/{name}')
        records.append({'filename': name, 'url': url, 'sha256': expected, 'bytes': size})
    manifest = {'schemaVersion': 1, 'family': family, 'modelId': specification['modelId'],
                'revision': specification['revision'], 'license': specification['license'],
                'cache': str(cache), 'verification': 'actual local byte length and SHA-256', 'assets': records}
    return cache, manifest


class LoRALinear(nn.Module):
    def __init__(self, base, rank=8, alpha=16):
        super().__init__()
        self.base = base
        self.scale = alpha / rank
        self.lora_a = nn.Parameter(torch.empty(rank, base.in_features, dtype=base.weight.dtype))
        self.lora_b = nn.Parameter(torch.zeros(base.out_features, rank, dtype=base.weight.dtype))
        nn.init.kaiming_uniform_(self.lora_a, a=math.sqrt(5))
        for parameter in base.parameters():
            parameter.requires_grad_(False)

    def forward(self, value):
        return self.base(value) + (value @ self.lora_a.T @ self.lora_b.T) * self.scale


def load_encoder(family, cache_root=CACHE_ROOT, with_adapter=False, rank=8, alpha=16):
    cache, manifest = prepare(family, cache_root, offline=True)
    tokenizer = AutoTokenizer.from_pretrained(str(cache), local_files_only=True, trust_remote_code=False)
    tokenizer.padding_side = 'right'
    model = AutoModel.from_pretrained(str(cache), local_files_only=True, trust_remote_code=False,
                                     torch_dtype=torch.float32, attn_implementation='eager')
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    targets = []
    if with_adapter:
        layers = model.encoder.layer if family == 'e5' else model.layers
        for index, layer in enumerate(layers):
            attention = layer.attention.self if family == 'e5' else layer.self_attn
            names = ('query', 'value') if family == 'e5' else ('q_proj', 'v_proj')
            prefix = f'encoder.layer.{index}.attention.self' if family == 'e5' else f'layers.{index}.self_attn'
            for name in names:
                setattr(attention, name, LoRALinear(getattr(attention, name), rank, alpha))
                targets.append(f'{prefix}.{name}')
    model.eval()  # Disable dropout while keeping LoRA autograd available.
    return model, tokenizer, targets, manifest


def adapter_state(model):
    return {name: value.detach().cpu().contiguous().clone() for name, value in model.state_dict().items()
            if '.lora_' in name}


def load_adapter(model, state):
    if set(state) != set(adapter_state(model)):
        raise ValueError('Adapter names differ from the exact target architecture')
    result = model.load_state_dict(state, strict=False)
    if result.unexpected_keys or any('.lora_' in name for name in result.missing_keys):
        raise ValueError('Adapter loading failed')


def tensor_hash(state):
    digest = hashlib.sha256()
    for name, tensor in sorted(state.items()):
        digest.update(name.encode())
        digest.update(str(tuple(tensor.shape)).encode())
        digest.update(tensor.detach().cpu().contiguous().numpy().tobytes())
    return digest.hexdigest()


def frozen_base_hash(model):
    return tensor_hash({name: value for name, value in model.state_dict().items() if '.lora_' not in name})


def format_texts(family, texts, query):
    if family == 'e5':
        return [('query: ' if query else 'passage: ') + text for text in texts]
    return [QUERY_INSTRUCTION + text if query else text for text in texts]


def tokenize(tokenizer, family, texts, query=False, max_tokens=256):
    if not texts or any(not isinstance(text, str) or not text.strip() for text in texts):
        raise ValueError('Encoding requires nonempty text strings')
    if not 8 <= max_tokens <= 512:
        raise ValueError('This bounded experiment accepts 8–512 tokens')
    formatted = format_texts(family, texts, query)
    if family == 'e5':
        return tokenizer(formatted, padding=True, truncation=True, max_length=max_tokens, return_tensors='pt')
    # Explicit right-padding/EOS contract. Truncation can otherwise remove EOS.
    values = tokenizer(formatted, padding=False, truncation=True, max_length=max_tokens - 1,
                       add_special_tokens=True, return_attention_mask=False)
    rows = []
    for ids in values['input_ids']:
        if not ids or ids[-1] != tokenizer.eos_token_id:
            ids = ids + [tokenizer.eos_token_id]
        rows.append({'input_ids': ids, 'attention_mask': [1] * len(ids)})
    result = tokenizer.pad(rows, padding=True, return_tensors='pt')
    positions = result['attention_mask'].sum(1) - 1
    if not torch.all(result['input_ids'][torch.arange(len(rows)), positions] == tokenizer.eos_token_id):
        raise ValueError('EOS pooling invariant failed')
    return result


def embed(model, tokenizer, family, texts, query=False, max_tokens=256, batch_size=8, gradients=False):
    vectors = []
    with torch.set_grad_enabled(gradients):
        for start in range(0, len(texts), batch_size):
            tokens = tokenize(tokenizer, family, texts[start:start + batch_size], query, max_tokens)
            hidden = model(**tokens).last_hidden_state
            if family == 'e5':
                mask = tokens['attention_mask'].unsqueeze(-1).to(hidden.dtype)
                pooled = (hidden * mask).sum(1) / mask.sum(1).clamp(min=1)
            else:
                positions = tokens['attention_mask'].sum(1) - 1
                pooled = hidden[torch.arange(hidden.shape[0]), positions]
            vectors.append(torch.nn.functional.normalize(pooled, p=2, dim=1))
    if not vectors:
        raise ValueError('Cannot encode an empty collection')
    return torch.cat(vectors)


def truncation_report(tokenizer, family, texts, query=False, max_tokens=256):
    lengths = [len(tokenizer.encode(text, truncation=False))
               for text in format_texts(family, texts, query)]
    limit = max_tokens if family == 'e5' else max_tokens - 1
    return {'inputs': len(lengths), 'rawTokenMaximum': max(lengths, default=0),
            'inputsOverBudget': sum(value > limit for value in lengths),
            'tokenBudget': max_tokens, 'f2EosReservedToken': family == 'f2'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', choices=['e5', 'f2', 'all'], required=True)
    parser.add_argument('--cache-root', type=Path, default=CACHE_ROOT)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--manifest', type=Path)
    args = parser.parse_args()
    manifests = {}
    for family in ('e5', 'f2') if args.prepare == 'all' else (args.prepare,):
        _, manifests[family] = prepare(family, args.cache_root, args.offline)
        print(f'Verified {family}: {len(manifests[family]["assets"])} pinned files.', flush=True)
    if args.manifest:
        write_json(args.manifest, manifests)
