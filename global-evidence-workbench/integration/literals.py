"""Non-executing parser for JSON-like TypeScript exported literal arrays.
Rejects expressions, calls, templates and spreads rather than evaluating repository code.
"""
import re, json
TOKEN = re.compile(r'''\s+|//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[A-Za-z_$][\w$]*|[\[\]{}:,]''')
def parse_literal(text):
    tokens=[]; pos=0
    while pos<len(text):
        m=TOKEN.match(text,pos)
        if not m: raise ValueError('Nonliteral input at '+repr(text[pos:pos+40]))
        t=m.group();pos=m.end()
        if not t.isspace() and not t.startswith(('//','/*')):tokens.append(t)
    i=0
    def atom():
        nonlocal i
        t=tokens[i];i+=1
        if t in ('[','{'):
            out=[] if t=='[' else {}; end=']' if t=='[' else '}'
            while tokens[i]!=end:
                if t=='{':
                    k=tokens[i];i+=1
                    k=json.loads(k) if k.startswith('"') else k.strip("'")
                    if tokens[i]!=':':raise ValueError('Missing colon')
                    i+=1;out[k]=atom()
                else:out.append(atom())
                if tokens[i]==',':i+=1
                elif tokens[i]!=end:raise ValueError('Missing comma')
            i+=1;return out
        if t.startswith('"'):return json.loads(t)
        if t.startswith("'"):return bytes(t[1:-1], 'utf8').decode('unicode_escape') if '\\' in t else t[1:-1]
        if t in ('true','false','null'):return {'true':True,'false':False,'null':None}[t]
        try:return float(t) if any(c in t for c in '.eE') else int(t)
        except ValueError:raise ValueError('Expression rejected: '+t)
    out=atom()
    if i!=len(tokens):raise ValueError('Trailing expression')
    return out

def exported_array(text,name):
    m=re.search(r'export const '+name+r'\s*:[^=]+=',text)
    if not m:raise ValueError('Missing array '+name)
    # The repository uses a standalone ]; terminator for each literal export.
    end=text.index('\n];',m.end())
    return parse_literal(text[m.end():end+2])
