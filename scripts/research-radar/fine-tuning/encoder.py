"""Minimal local MiniLM LoRA encoder. Base weights remain frozen."""
import hashlib
import math

import torch
from torch import nn
from transformers import AutoModel, AutoTokenizer


class LoRALinear(nn.Module):
    def __init__(self, base, rank=8, alpha=16):
        super().__init__()
        self.base = base
        self.scale = alpha / rank
        self.lora_a = nn.Parameter(torch.empty(rank, base.in_features))
        self.lora_b = nn.Parameter(torch.zeros(base.out_features, rank))
        nn.init.kaiming_uniform_(self.lora_a, a=math.sqrt(5))
        for parameter in self.base.parameters():
            parameter.requires_grad_(False)

    def forward(self, value):
        return self.base(value) + (value @ self.lora_a.T @ self.lora_b.T) * self.scale


def load_encoder(cache, config, with_adapter=True):
    tokenizer = AutoTokenizer.from_pretrained(str(cache), local_files_only=True)
    model = AutoModel.from_pretrained(str(cache), local_files_only=True, attn_implementation='eager')
    for parameter in model.parameters():
        parameter.requires_grad_(False)
    targets = []
    if with_adapter:
        for i, layer in enumerate(model.encoder.layer):
            for name in ('query', 'value'):
                attention = layer.attention.self
                setattr(attention, name, LoRALinear(getattr(attention, name), config['rank'], config['alpha']))
                targets.append(f'encoder.layer.{i}.attention.self.{name}')
    # Disable base-model dropout. This makes the bounded CPU experiment repeatable.
    # Autograd remains enabled for LoRA even while evaluation mode is active.
    model.eval()
    return model, tokenizer, targets


def adapter_state(model):
    return {name: value.detach().cpu().contiguous().clone() for name, value in model.state_dict().items() if '.lora_' in name}


def load_adapter(model, state):
    expected = set(adapter_state(model))
    if set(state) != expected:
        raise ValueError('Adapter tensor names do not match this architecture')
    result = model.load_state_dict(state, strict=False)
    if result.unexpected_keys or any('.lora_' in name for name in result.missing_keys):
        raise ValueError('Adapter failed strict adapter-key loading')


def tensor_hash(state):
    digest = hashlib.sha256()
    for name, tensor in sorted(state.items()):
        digest.update(name.encode())
        digest.update(str(tuple(tensor.shape)).encode())
        digest.update(tensor.detach().cpu().contiguous().numpy().tobytes())
    return digest.hexdigest()


def frozen_base_hash(model):
    return tensor_hash({name: value for name, value in model.state_dict().items() if '.lora_' not in name})


def embed(model, tokenizer, texts, max_tokens=256, batch_size=16, gradients=False):
    vectors = []
    with torch.set_grad_enabled(gradients):
        for start in range(0, len(texts), batch_size):
            tokens = tokenizer(texts[start:start + batch_size], padding=True, truncation=True,
                               max_length=max_tokens, return_tensors='pt')
            hidden = model(**tokens).last_hidden_state
            mask = tokens['attention_mask'].unsqueeze(-1).to(hidden.dtype)
            pooled = (hidden * mask).sum(1) / mask.sum(1).clamp(min=1)
            vectors.append(torch.nn.functional.normalize(pooled, p=2, dim=1))
        return torch.cat(vectors, dim=0)
