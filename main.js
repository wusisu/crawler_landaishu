import request from 'request'
import bluebird from 'bluebird'
import fs from 'fs'
import iconv from 'iconv-lite'
import path from 'path'
import {Cookie, Host, pages, page_base} from './config.js'
bluebird.promisifyAll(fs)

const PATHS = {
  main: path.join(__dirname, './output')
}
PATHS.pages = path.join(PATHS.main, 'pages')
PATHS.articles_json = path.join(PATHS.main, 'articles.json')
PATHS.articles = path.join(PATHS.main, 'articles')

//basic
const jarWithCookie = request.jar()
for (let kv of Cookie.split('; ')) {
  jarWithCookie.setCookie(request.cookie(kv), Host)
}

const requestBuffer = url => {
  return new Promise(resolve => {
    let buffer = []
    request({url, jar: jarWithCookie}, ()=>null)
      .on('data', chunk => buffer.push(chunk))
      .on('end', ()=>resolve(Buffer.concat(buffer)))
  })
}

const sleep = time => {
  return new Promise(resolve=>{
    setTimeout(resolve, time)
  })
}

const matchAll = (regex, data) => {
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


// steps
const mkdirInitialized = async () => {
  let all = ['main', 'pages', 'articles']
  for (let i = 0; i < all.length; i++) {
    let dir = PATHS[all[i]]
    let exists = await fs.existsSync(dir)
    if(!exists) await fs.mkdirAsync(dir)
  }
}

const getPages = async () => {
  for (var i = 0; i < pages.length; i++) {
    let page = await requestBuffer(pages[i])
    page = iconv.decode(page, 'GBK')
    await fs.writeFileAsync(path.join(PATHS.pages, 'page'+i+'.html'), page)
  }
}

const parsePages = async () => {
  let trRegex = /<tr height=25>([\s\S]*?)<\/tr>/g
  let tdRegex = /<td.*?>(.*?)<\/td>/g
  let titleRegex = /<a.*?>(.*?)<\/a>/
  let urlRegex = /<a href=(.*?) /

  let json = []
  let filenames = await fs.readdirAsync(PATHS.pages)
  for (let i = 0; i < filenames.length; i++) {
    let filePath = path.join(PATHS.pages, filenames[i])
    let page = await fs.readFileAsync(filePath, 'utf8')
    let all = matchAll(trRegex, page).map(m=>m[1])
    all = all.map(tr=>matchAll(tdRegex, tr).map(m=>m[1]))
    all = all.map(ar=>{
      return {
        id: ar[0],
        date: ar[2],
        url: path.join(page_base, urlRegex.exec(ar[1])[1]),
        title: titleRegex.exec(ar[1])[1],
      }
    })
    json = json.concat(all)
  }
  await fs.writeFileAsync(PATHS.articles_json, JSON.stringify(json, null, '\t'))
}

const getArticles = async () => {
  let json = await fs.readFileAsync(PATHS.articles_json, 'utf8')
  json = JSON.parse(json)
  if(true){
    let url = json[0].url
    console.info(url);
    let article = await requestBuffer(url)
    console.info(article);
    article = iconv.decode(article, 'GBK')
    await sleep(200)
    // console.info(article);
  }
}

const main = async () => {
  // await mkdirInitialized()
  // await getPages()
  // await parsePages()
  await getArticles()
}

main().catch(e=>console.error(e))
