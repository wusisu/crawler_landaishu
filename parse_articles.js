import {PATHS} from './config.js'
import {matchAll, mkdir} from './util.js'
import path from 'path'
import fs from 'fs'
import bluebird from 'bluebird'
bluebird.promisifyAll(fs)

const extractArticles = async suf=>{
  let json = []
  let titleRegex = /<tr><td height=35 align=center class=newsTitle><B>(.*?)<\/B><\/td><\/tr>/
  let dateRegex = /<tr><td height=35 align=right class=news>(.*?)<\/td><\/tr>/
  let contentRegex = /<font class=news><div class=news>([\s\S]*?)<\/div><\/font>/
  let articlesJson = await fs.readFileAsync(PATHS.articlesJson, 'utf8')
  articlesJson = JSON.parse(articlesJson)
  for (let i = 0; i < articlesJson.length; i++) {
    let article = articlesJson[i]
    let articleHtml = await fs.readFileAsync(path.join(PATHS.articles, 1000+i+'.html'))
    article.c_title = titleRegex.exec(articleHtml)[1]
    article.c_date = dateRegex.exec(articleHtml)[1]
    article.c_content = contentRegex.exec(articleHtml)[1]
    json.push(article)
  }
  let dbPath = PATHS.articlesDb(suf)
  await fs.writeFileAsync(dbPath, JSON.stringify(json, null, '\t'))
  return suf
}

const main = async ()=>{
  await extractArticles('raw')
}

main().catch(e=>console.error(e))
