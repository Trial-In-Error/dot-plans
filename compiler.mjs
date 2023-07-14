import * as fs from 'node:fs'
import * as path from 'node:path'
import Handlebars from 'handlebars'
import livereload from 'livereload'
import handlebarsHelperRepeat from 'handlebars-helper-repeat'
import { spawn } from 'child_process'

const server = livereload.createServer()
const lastTemplateValues = {}
const paths = [path.normalize('./css/common.css')]

Handlebars.registerHelper('repeat', handlebarsHelperRepeat)

function registerFile(templatePath, context) {
  lastTemplateValues[templatePath] = ''
  paths.push(buildHTMLPath(templatePath))
  fs.watch(templatePath, { persistent: true }, (eventType, path) => compileTemplate(eventType, path, context))
  fs.watch(buildCSSPath(templatePath), { persistent: true }, (eventType, path) => compileTemplate(eventType, path, context))
}

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
  server.watch(paths)
  spawn('node', ['./node_modules/http-server/bin/http-server'])
}

function compileTemplate(eventType, templatePath, context) {
  templatePath = path.normalize('./templates/' + path.basename(templatePath, path.extname(templatePath)) + '.handlebars')
  let commonCSSPath = path.normalize('./css/common.css')
  let template = String(fs.readFileSync(templatePath))

  // TODO: this fires twice per save?
  // TODO: BUG: common.css does not trigger updates of all templates
  if (eventType === 'change') {
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

let times = ["6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30", "4:00", "4:30", "5:00", "5:30", "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30"]
// this is for auto-compile
registerFile('./templates/week-left.handlebars', {
  days: ["Monday", "Tuesday", "Wednesday"],
  times
})
registerFile('./templates/week-right.handlebars', {
  days: ["Thursday", "Friday", "Saturday", "Sunday"],
  times
})

startHotReload()
