import request from 'request'
import bluebird from 'bluebird'
import fs from 'fs'
import iconv from 'iconv-lite'
import path from 'path'
import {PATHS, Cookie, Host, pages, page_base, Home, images_pages, images_pages_base} from './config.js'
import urlUtil from 'url'
import {matchAll, mkdir} from './util.js'
bluebird.promisifyAll(fs)

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

// steps
const mkdirInitialized = async () => {
  let all = ['main', 'pages', 'articles', 'images', 'uploaded_pages', 'uploaded']
  for (let i = 0; i < all.length; i++) {
    let dir = PATHS[all[i]]
    await mkdir(dir)
  }
}

const getPages = async (urls, savePath) => {
  for (var i = 0; i < urls.length; i++) {
    let page = await requestBuffer(urls[i])
    page = iconv.decode(page, 'GBK')
    await fs.writeFileAsync(path.join(savePath, 'page'+i+'.html'), page)
    console.info(`save page ${i}/${urls.length}`);
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
  let imgRegex = /<img.*?src="([^"]*?)"(?:>|.*?border=\d>)/g
  let filenames = await fs.readdirAsync(PATHS.articles)
  let out = []
  for (let i = 0; i < filenames.length; i++) {
    let filename = filenames[i]
    if(filename.startsWith('.')) continue
    let filePath = path.join(PATHS.articles, filename)
    let article = await fs.readFileAsync(filePath, 'utf8')
    let content = contentRegex.exec(article)[1]
    let allImage = matchAll(imgRegex, content)
      .map(m=>m[1])
      .filter(p=>p!=='' && !p.startsWith('http://'))
      .map(p=>urlUtil.resolve(Home, p))
    out = out.concat(allImage)
  }
  await fs.writeFileAsync(PATHS.imagesJson, JSON.stringify(out, null, '\t'))
}

const downloadImages = async (jsonPath, savePath, startIndex=0) => {
  let json = await fs.readFileAsync(jsonPath, 'utf8')
  json = JSON.parse(json)
  for (var i = startIndex; i < json.length; i++) {
    let url = json[i]
    let buffer = await requestBuffer(json[i])
    let filePath
    if(url.startsWith(Home))
      filePath = url.replace(Home, '')
    else{
      let splits = url.split('/')
      filePath = splits[splits.length - 1]
    }
    let realFilePath = savePath
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

// images that uploaded.
const parseUploadsImagesUrls = async ()=>{
  let contentRegex = /<table.*?bordercolor=#3361CA>([\s\S]*?)<\/table>/
  let imgRegex = /<img border=0 src=(.*?) /g
  let filenames = await fs.readdirAsync(PATHS.uploaded_pages)
  let out = []
  for (let i = 0; i < filenames.length; i++) {
    let filePath = path.join(PATHS.uploaded_pages, filenames[i])
    let page = await fs.readFileAsync(filePath, 'utf8')
    let content = contentRegex.exec(page)[1]
    let allImage = matchAll(imgRegex, content).map(m=>urlUtil.resolve(images_pages_base, m[1]))
    out = out.concat(allImage)
  }
  await fs.writeFileAsync(PATHS.uploaded_json, JSON.stringify(out, null, '\t'))
}

const main = async () => {
  await mkdirInitialized()
  console.log('ok init')
  await getPages(pages, PATHS.pages)
  console.log('ok pages')
  await parsePages()
  console.log('ok article list')
  await getArticles()
  console.log('ok articles')
  await parseImagesUrls()
  console.log('ok image list')
  await downloadImages(PATHS.imagesJson, PATHS.images)
  console.log('ok images')


  //uploads
  // await getPages(images_pages, PATHS.uploaded_pages)
  // await parseUploadsImagesUrls()
  // downloadImages(PATHS.uploaded_json, PATHS.uploaded, 1119)
}

main().catch(e=>console.error(e))
