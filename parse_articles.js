import {PATHS, DEPLOY_ROOT} from './config.js'
import {matchAll, mkdir} from './util.js'
import path from 'path'
import fs from 'fs'
import bluebird from 'bluebird'
bluebird.promisifyAll(fs)

const extractArticles = async ()=>{
  let json = []
  let titleRegex = /<tr><td height=35 align=center class=newsTitle><B>(.*?)<\/B><\/td><\/tr>/
  let dateRegex = /<tr><td height=35 align=right class=news>(.*?)<\/td><\/tr>/
  let contentRegex = /<font class=news><div class=news>([\s\S]*?)<\/div><\/font>/
  let categoryRegex = /博客导航.*?<\/a.*?<a.*?>(.*?)<\/a><\/td>/
  let articlesJson = await fs.readFileAsync(PATHS.articlesJson, 'utf8')
  articlesJson = JSON.parse(articlesJson)
  for (let i = 0; i < articlesJson.length; i++) {
    let article = articlesJson[i]
    let articleHtml = await fs.readFileAsync(path.join(PATHS.articles, 1000+i+'.html'))
    article.category = categoryRegex.exec(articleHtml)[1]
    article.c_title = titleRegex.exec(articleHtml)[1]
    article.c_date = dateRegex.exec(articleHtml)[1]
    article.c_content = contentRegex.exec(articleHtml)[1]
    json.push(article)
  }
  let dbPath = PATHS.articlesDb('raw')
  await fs.writeFileAsync(dbPath, JSON.stringify(json, null, '\t'))
}

const cleanupData = async () => {
  let dateRegex = /\d{4}-\d{2}-\d{2}/
  let dbPath = PATHS.articlesDb('raw')
  let db = await fs.readFileAsync(dbPath, 'utf8')
  db = JSON.parse(db)
  let json = db.map(article => {
    let date = dateRegex.exec(article.date)[0]
    let content = article.c_content
    return {
      title: article.title,
      date: date,
      url: article.url,
      content: content,
      category: article.category
    }
  })
  let cs = json.map(a=>a.content)
  cs = cs.map(c=>c
    .replace(/<img.*?src="([^"]*?)"(?:>|.*?border=\d>)/g, `\n![](${DEPLOY_ROOT}$1)`)
    .replace(/<[Aa] target=_blank href="(.*?)">(.*?)<\/[aA]>/g, '[$2]($1)')
    .replace(/<\?xml[^>]*?\/>/g,'')
    .replace(/<[pP][^>]*?>([\s\S]*?)<\/[pP]>/g,'\n$1')
  )
  for (let i = 0; i < 5; i++) {
    ;['em','font','strong', 'tr', 'td', 'tbody', 'table', 'span', 'o:p', 'b', 'center', 'div', 'BLOCKQUOTE'].forEach(nodeName=>{
      cs = cs.map(c=>c.replace(new RegExp(`<(?:${nodeName}|${nodeName.toUpperCase()})[^>]*?>([\\s\\S]*?)(?:\<\/${nodeName}>|<\/${nodeName.toUpperCase()}>)`,'g'), '$1'))
    })
  }
  cs = cs.map(c=>c
      .replace(/\r\n/g,'')
      .replace(/&nbsp;/g,'')
      .replace(/<[bB][rR]>/g,'\n')
      .replace(/&gt;/g,'>')
      .replace(/&amp;/g,'&')
      .replace(/&lt;/g,'<')
    )
  if(cs.length!==json.length) throw 'length error'

  let categories = {}
  for (let i = 0; i < json.length; i++) {
    json[i].content = cs[i]
    let category = json[i].category
    if (!category) category = 'no'
    if(!categories[category]) categories[category] = []
    categories[category].push(json[i])
  }

  let jsonPath = PATHS.articlesDb('clean')
  await fs.writeFileAsync(jsonPath, JSON.stringify(categories, null, '\t'))
}

const genPost = async ()=>{
  let dbPath = PATHS.articlesDb('clean')
  let db = await fs.readFileAsync(dbPath, 'utf8')
  db = JSON.parse(db)
  let postPath = path.join(PATHS.main, '_post')
  await mkdir(postPath)
  let all = []
  Object.keys(db).forEach(n=>all=all.concat(db[n]))
  for (var i = 0; i < all.length; i++) {
    let a = all[i]
    let post = `---\nlayout: post\ntitle: ${a.title}\ndate: ${a.date.replace(/-/g,'/')}\ncategories: ${a.category}\n---\n\n`
    post += `-[文章曾发布于蓝袋鼠](${a.url})-\n\n\n`
    post += a.content
    await fs.writeFileAsync(path.join(postPath, `${a.date}-${a.title}.md`), post)
  }

}

const main = async ()=>{
  // await extractArticles()
  await cleanupData()
  // await genPost()
}

main().catch(e=>console.error(e))
