"""Conservative lexical parsing for future notice analysis. Never strips arbitrary text."""
import re
from decimal import Decimal
PLAIN_OR_GROUPED=re.compile(r'(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,2}(?:,[0-9]{2})*,[0-9]{3})(?:\.[0-9]+)?\Z')
def amount(raw):
 if raw is None:return {'status':'missing','value':None,'raw':raw}
 text=str(raw).strip()
 if not text:return {'status':'missing','value':None,'raw':raw}
 body=re.sub(r'^(?:INR|Rs\.?|₹)\s*','',text,flags=re.I)
 if re.search(r'[eE][+-]?[0-9]',body):return {'status':'scientific-notation-quarantined','value':None,'raw':raw}
 if not PLAIN_OR_GROUPED.fullmatch(body):return {'status':'unrecognised-format','value':None,'raw':raw}
 return {'status':'parsed-numeric-lexeme','value':str(Decimal(body.replace(',',''))),'raw':raw}
def bids(raw):
 text='' if raw is None else str(raw).strip()
 if not re.fullmatch(r'[0-9]+',text):return {'status':'missing' if not text else 'unrecognised-format','value':None,'raw':raw}
 value=int(text)
 return {'status':'eligible-count' if 1<=value<=1000 else 'outside-analysis-range','value':value,'raw':raw}
