import * as fs from 'node:fs'
import * as path from 'node:path'
import Handlebars from 'handlebars'
import livereload from 'livereload'
import handlebarsHelperRepeat from 'handlebars-helper-repeat'
import { spawn } from 'child_process'

const server = livereload.createServer()
const lastTemplateValues = {}
// watch templates and CSS, only rebuild templates
const paths = [...fs.readdirSync('./templates').map((path) => './templates/' + path)]

Handlebars.registerHelper('repeat', handlebarsHelperRepeat)

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
  './templates/month.handlebars': {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  }
}

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
  server.watch(htmlPaths)
  spawn('node', ['./node_modules/http-server/bin/http-server', '-p 8082'])
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
    lastTemplateValues[templatePath] = template
    const compiled = Handlebars.compile(template)
    const string = compiled({ ...context, css })
    fs.writeFileSync(buildHTMLPath(templatePath), string)
  }
}

startHotReload()
