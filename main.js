import request from 'request'
import bluebird from 'bluebird'
import fs from 'fs'
import iconv from 'iconv-lite'
import path from 'path'
import {Cookie, Host, pages, page_base, Home} from './config.js'
import urlUtil from 'url'
bluebird.promisifyAll(fs)

const PATHS = {
  main: path.join(__dirname, './output')
}
PATHS.pages = path.join(PATHS.main, 'pages')
PATHS.articlesJson = path.join(PATHS.main, 'articles.json')
PATHS.articles = path.join(PATHS.main, 'articles')
PATHS.imagesJson = path.join(PATHS.main, 'images.json')
PATHS.images = path.join(PATHS.main, 'images')

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

const mkdir = async dir=>{
  let exists = await fs.existsSync(dir)
  if(!exists) return fs.mkdirAsync(dir)
}

// steps
const mkdirInitialized = async () => {
  let all = ['main', 'pages', 'articles', 'images']
  for (let i = 0; i < all.length; i++) {
    let dir = PATHS[all[i]]
    await mkdir(dir)
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
        url: urlUtil.resolve(page_base, urlRegex.exec(ar[1])[1]),
        title: titleRegex.exec(ar[1])[1],
      }
    })
    json = json.concat(all)
  }
  await fs.writeFileAsync(PATHS.articlesJson, JSON.stringify(json, null, '\t'))
}

const getArticles = async () => {
  let json = await fs.readFileAsync(PATHS.articlesJson, 'utf8')
  json = JSON.parse(json)
  for (var i = 0; i < json.length; i++) {
    let articleMessage = json[i]
    let url = articleMessage.url
    let article = await requestBuffer(url)
    article = iconv.decode(article, 'GBK')
    let filename = 1000 + i +'.html'
    articleMessage.localFileName = filename
    await fs.writeFileAsync(path.join(PATHS.articles, filename), article)
    console.info(`ok with ${articleMessage.title}. ${i}/${json.length}`)
    await sleep(800)
  }
  await fs.writeFileAsync(PATHS.articlesJson, JSON.stringify(json, null, '\t'))
}

const parseImagesUrls = async () => {
  let contentRegex = /<font class=news><div class=news>([\s\S]*?)<\/div><\/font>/
  let imgRegex = /<img .*? border=0 src="(.*?)">/g
  let filenames = await fs.readdirAsync(PATHS.articles)
  let out = []
  for (let i = 0; i < filenames.length; i++) {
    let filePath = path.join(PATHS.articles, filenames[i])
    let article = await fs.readFileAsync(filePath, 'utf8')
    let content = contentRegex.exec(article)[1]
    let allImage = matchAll(imgRegex, content).map(m=>urlUtil.resolve(Home, m[1]))
    out = out.concat(allImage)
  }
  await fs.writeFileAsync(PATHS.imagesJson, JSON.stringify(out, null, '\t'))
}

const downloadImages = async () => {
  let json = await fs.readFileAsync(PATHS.imagesJson, 'utf8')
  json = JSON.parse(json)
  for (var i = 75; i < json.length; i++) {
    let url = json[i]
    let buffer = await requestBuffer(json[i])
    let filePath
    if(url.startsWith(Home))
      filePath = url.replace(Home, '')
    else{
      let splits = url.split('/')
      filePath = splits[splits.length - 1]
    }
    let realFilePath = PATHS.images
    let splits = filePath.split('/')
    while(splits.length > 1){
      realFilePath += '/' + splits.shift()
      await mkdir(realFilePath)
    }
    realFilePath += '/' + splits[0]
    await fs.writeFileAsync(realFilePath, buffer)
    console.info(`saved ${filePath} ${i}/${json.length}`);
  }
}

const main = async () => {
  // await mkdirInitialized()
  // await getPages()
  // await parsePages()
  // await getArticles()
  // await parseImagesUrls()
  // await downloadImages()
}

main().catch(e=>console.error(e))
