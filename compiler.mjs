import * as fs from 'node:fs'
import * as path from 'node:path'
import Handlebars from 'handlebars'
import livereload from 'livereload'

const server = livereload.createServer()
const lastTemplateValues = {}
const paths = []

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
}

function compileTemplate(eventType, templatePath) {
  templatePath = path.normalize('./templates/' + path.basename(templatePath, path.extname(templatePath)) + '.handlebars')
  let template = String(fs.readFileSync(templatePath))
  // TODO: this fires twice per save?
  if (eventType === 'change') {
    let css
    console.log('Updated %s', templatePath)
    try {
      css = String(fs.readFileSync(buildCSSPath(templatePath)))
      console.log('CSS exists', css)
    } catch (e) {}
    lastTemplateValues[templatePath] = template
    const compiled = Handlebars.compile(template)
    const context = { doesWhat: "compiles", css }
    const string = compiled(context)
    fs.writeFileSync(buildHTMLPath(templatePath), string)
  }
}

// this is for auto-compile
registerFile('./templates/week-left.handlebars')

startHotReload()
