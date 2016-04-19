import fs from 'fs'

export const matchAll = (regex, data) => {
  if(!regex.global) throw 'regex should be global'
  let match
  let out = []
  regex.lastIndex = 0;
  while(true){
    match = regex.exec(data)
    if(!match) break
    out.push(match)
  }
  return out
}

export const mkdir = async dir=>{
  let exists = await fs.existsSync(dir)
  if(!exists) return fs.mkdirAsync(dir)
}
