export const Cookie = 'ASPSESSIONIDQSBCBATQ=FLOFNFFCNELMMCNKFBCIAGGO; fullname=%BA%DA%E6%A4%E6%A4; passwd=9d8011c38011bfe6; purview=1; UserID=4175; Username=%BA%DA%E6%A4%E6%A4; KEY=bbsmaster; reglevel=6; __utmt=1; __utma=149380779.1786162990.1461024439.1461024439.1461037130.2; __utmb=149380779.3.10.1461037130; __utmc=149380779; __utmz=149380779.1461024439.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic'
export const Host = 'http://landaishu.hi2net.com/'

export const page_base = 'http://landaishu.hi2net.com/home/manage'
export const pages = []
for (let i = 0; i < 8; i++) {
  pages.push(page_base + '/diary_list.asp?userid=4175&id=-1&page=' + (1+i))
}
