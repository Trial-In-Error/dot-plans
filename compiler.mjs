import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import Handlebars from 'handlebars'
import livereload from 'livereload'
import handlebarsHelperRepeat from 'handlebars-helper-repeat'
import helpers from 'handlebars-helpers'
const { multiply } = helpers(['math'])
import listToPercentage from './helpers/listToPercentage.mjs'
import { spawn } from 'child_process'
import nodeHtmlToImage from 'node-html-to-image'
import PDFDocument from 'pdfkit'

const config = {
  size: [7, 8], // in inches, width x height
  // the DPI has to be 96 when setting the puppeteer width/height args
  // but it has to be 69 when rendering to PDF...??
  dpi: 96,
  margins: [ ".33in", "0in" ], // in inches, horizontal x vertical
}

const server = livereload.createServer()
// watch templates and CSS, only rebuild templates
const paths = [...fs.readdirSync('./templates').map((path) => './templates/' + path)]

Handlebars.registerHelper('repeat', handlebarsHelperRepeat)
Handlebars.registerHelper('listToPercentage', listToPercentage)
Handlebars.registerHelper('multiply', multiply)

const times = ["6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30", "4:00", "4:30", "5:00", "5:30", "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30"]

const contexts = {
  './templates/week-left.handlebars': {
    days: ["Monday", "Tuesday", "Wednesday"],
    times
  },
  './templates/week-right.handlebars': {
    days: ["Thursday", "Friday", "Saturday", "Sunday"],
    times
  },
  './templates/week-unified.handlebars': {
    topDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
    bottomDays: ["Friday", "Saturday", "Sunday"]
  },
  './templates/month.handlebars': {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  }
}

Object.keys(contexts).forEach((key) => {
  contexts[key].size = config.size
  contexts[key].dpi = config.dpi
  contexts[key].margins = config.margins
})

fs.watch('./css', { persistent: true }, compileTemplates)
fs.watch('./templates', { persistent: true }, compileTemplates)

function buildHTMLPath(templatePath) {
  const htmlPath = path.normalize('./html/' + path.basename(templatePath, path.extname(templatePath)) + '.html')
  return htmlPath
}

function buildCSSPath(templatePath) {
  const cssPath = path.normalize('./css/' + path.basename(templatePath, '.handlebars') + '.css')
  console.log('input', templatePath, 'output', cssPath)
  return cssPath
}

function startHotReload() {
  let htmlPaths = fs.readdirSync('./html').map((path) => './html/' + path)
  // this is dumb, but templatePath has to be the path to a real file, even when kicking off the first build
  compileTemplates("change", "./templates/month.handlebars" )
  server.watch(htmlPaths)
  spawn('node', ['./node_modules/http-server/bin/http-server', '-p 8082'])
  console.log('Server with compiled HTML running at: http://localhost:8082/html/')
}

function compileTemplates(eventType) {
  for(let i = 0; i < paths.length; i++) {
    compileTemplate(eventType, paths[i])
  }
}

function compileTemplate(eventType, templatePath) {
  console.log('eventType', eventType, 'templatePath', templatePath)
  if (eventType === 'change' && path.extname(templatePath) === '.handlebars') {
    let context = contexts[templatePath]
    let commonCSSPath = path.normalize('./css/common.css')
    let template = String(fs.readFileSync(templatePath))
    let css
    console.log('Updated %s', templatePath)
    try {
      css = String(fs.readFileSync(buildCSSPath(templatePath)))
      css += String(fs.readFileSync(commonCSSPath))
    } catch (e) {}
    const compiled = Handlebars.compile(template)
    const string = compiled({ ...context, css })
    const imagePath = path.normalize('./images/' + path.basename(templatePath, '.handlebars') + '.png')
    const pdfPath = path.normalize('./pdf/' + path.basename(templatePath, '.handlebars') + '.pdf')
    fsp.writeFile(buildHTMLPath(templatePath), string)
      .then(() => nodeHtmlToImage({
        output: imagePath,
        html: string,
        beforeScreenshot: (p) => { return p.emulateMediaType('print') },
        puppeteerArgs: {
          defaultViewport: {
            width:  config.size[0] * config.dpi,
            height:  config.size[1] * config.dpi,
            // deviceScaleFactor: config.dpi
          }
        }
      }))
      .then(() => {
        const doc = new PDFDocument()
        doc.pipe(fs.createWriteStream(pdfPath))
        // the DPI has to be 96 when setting the puppeteer width/height args
        // but it has to be 69 when rendering to PDF...??
        doc.image(imagePath, { fit: [69 * config.size[0], 69 * config.size[1]] })
        doc.addPage()
        doc.image(imagePath, { fit: [69 * config.size[0], 69 * config.size[1]] })
        doc.end()
      })
      .then(() => console.log(`Saved ${imagePath}.`))
  }
}

startHotReload()
