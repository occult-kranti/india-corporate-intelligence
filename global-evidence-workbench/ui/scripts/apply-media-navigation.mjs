import fs from 'node:fs';import path from 'node:path';
// Only additive HTML navigation changes. Does not replace CSS, application code or build scripts.
const root=process.argv[2];if(!root)throw Error('Usage: node scripts/apply-media-navigation.mjs /absolute/path/to/current/ui');
for(const name of ['index.html','finance.html']){
 const file=path.join(root,name);if(!fs.existsSync(file))throw Error('Missing current page: '+file);
 let original=fs.readFileSync(file,'utf8');const style='<link rel="stylesheet" href="./src/media-nav.css">';if(!original.includes('./src/media-nav.css')){if(!original.includes('</head>'))throw Error(name+': missing head');original=original.replace('</head>',style+'</head>');}if(/href=["']\.\/media\.html["']/.test(original)){fs.writeFileSync(file,original);console.log(name+': media link already present');continue;}
 const link='<a href="./media.html">Media &amp; power</a>';
 let next;
 if(/<nav\b[^>]*class=["'][^"']*section-nav[^"']*["'][^>]*>[\s\S]*?<\/nav>/.test(original))next=original.replace(/(<nav\b[^>]*class=["'][^"']*section-nav[^"']*["'][^>]*>[\s\S]*?)(<\/nav>)/,(_,start,end)=>start+link+end);
 else if(/<\/header>/.test(original))next=original.replace('</header>','</header><nav class="section-nav" aria-label="Workbench sections"><a href="./index.html"'+(name==='index.html'?' aria-current="page"':'')+'>Global evidence</a><a href="./finance.html"'+(name==='finance.html'?' aria-current="page"':'')+'>Public assets &amp; finance</a>'+link+'</nav>');
 else throw Error(name+': expected navigation/header not found; inspect manually');
 if(!next.includes(link))throw Error('Navigation insertion failed');fs.writeFileSync(file,next);console.log(name+': additive media navigation link inserted');
}
