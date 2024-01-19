import helpers from 'handlebars-helpers'
const { multiply } = helpers(['math'])
import handlebarsHelperRepeat from 'handlebars-helper-repeat'
import listToPercentage from './helpers/listToPercentage.mjs'
import * as path from 'node:path'

export function setupHandlebars(handlebarsInstance) {
  handlebarsInstance.registerHelper('repeat', handlebarsHelperRepeat)
  handlebarsInstance.registerHelper('listToPercentage', listToPercentage)
  handlebarsInstance.registerHelper('multiply', multiply)
}

export function buildHTMLPath(templatePath) {
  return path.normalize('./html/' + path.basename(templatePath, path.extname(templatePath)) + '.html')
}

export function buildCSSPath(templatePath) {
  return path.normalize('./css/' + path.basename(templatePath, path.extname(templatePath)) + '.css')
}

export function buildImagePath(templatePath) {
  return path.normalize('./images/' + path.basename(templatePath, path.extname(templatePath)) + '.png')
}

export function buildPDFPath(templatePath) {
    return path.normalize('./pdf/' + path.basename(templatePath, path.extname(templatePath)) + '.pdf')
}
