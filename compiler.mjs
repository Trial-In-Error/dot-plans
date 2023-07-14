import * as fs from 'node:fs'
import * as path from 'node:path'
import Handlebars from 'handlebars'
import livereload from 'livereload'
import handlebarsHelperRepeat from 'handlebars-helper-repeat'
import { spawn } from 'child_process'

const server = livereload.createServer()
const lastTemplateValues = {}
const paths = []

Handlebars.registerHelper('repeat', handlebarsHelperRepeat)

function registerFile(templatePath) {
  lastTemplateValues[templatePath] = ''
  paths.push(buildHTMLPath(templatePath))
  fs.watch(templatePath, { persistent: true }, compileTemplate)
  fs.watch(buildCSSPath(templatePath), { persistent: true }, compileTemplate)
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

function compileTemplate(eventType, templatePath) {
  templatePath = path.normalize('./templates/' + path.basename(templatePath, path.extname(templatePath)) + '.handlebars')
  let template = String(fs.readFileSync(templatePath))
  let times = ["6:30", "7:00", "7:30", "8:00", "7:30", "9:00", "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "1:00", "1:30", "2:00", "2:30", "3:00", "3:30", "4:00", "4:30", "5:00", "5:30", "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30", "10:00", "10:30"]
  let days = ["Monday", "Tuesday", "Wednesday"]

  // TODO: this fires twice per save?
  if (eventType === 'change') {
    let css
    console.log('Updated %s', templatePath)
    try {
      css = String(fs.readFileSync(buildCSSPath(templatePath)))
    } catch (e) {}
    lastTemplateValues[templatePath] = template
    const compiled = Handlebars.compile(template)
    const context = { times, days, css }
    const string = compiled(context)
    fs.writeFileSync(buildHTMLPath(templatePath), string)
  }
}

// this is for auto-compile
registerFile('./templates/week-left.handlebars')

startHotReload()
