import fs from 'node:fs';
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist');for(const item of ['index.html','src','public'])fs.cpSync(item,'dist/'+item,{recursive:true});console.log('Built static app in dist/');
