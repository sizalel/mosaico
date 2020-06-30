'use strict';
/* globals describe: false, it: false, expect: false */
/* globals process: false, console: false */

var mockery = require('mockery');
mockery.enable();
mockery.registerAllowables(['../src/js/converter/declarations.js', 'console', './utils.js', './domutils.js', 'console', '../node_modules/mensch']);

/*
var cheerio = require('cheerio');
var currentDocument = cheerio.load('<body></body>');

mockery.registerMock('jquery', function() {
console.log("XXXXX", currentDocument);
return currentDocument.apply(currentDocument, arguments);
});
*/
mockery.registerMock('jquery', require('cheerio'));

mockery.registerMock('jsep', require('../node_modules/jsep/src/jsep.js'));
mockery.registerMock('mensch/lib/parser.js', function() {
  var parse = require('../node_modules/mensch').parse;
  return parse.apply(parse, arguments);
});
var elaborateDeclarations = require('../src/js/converter/declarations.js');

var mockedBindingProvider = function(a, b) {
  // console.log("binding provider for", a, b);
  return "$" + a + "[" + b + "]";
};

var templateUrlConverter = function(url) {
  return url;
}



function _parseTemplate(html) {
  var translateTemplate = require('../src/js/converter/parser.js');
  var templates = [];
  var $ = require('jquery');
  var myTemplateCreator = function(htmlOrElement, optionalName, templateMode) {
    templates.push({
      optionalName: optionalName,
      templateMode: templateMode,
      html: typeof htmlOrElement == 'object' ? $.html(htmlOrElement) : htmlOrElement
    });
  };
  var templateDef = translateTemplate('template', html, templateUrlConverter, myTemplateCreator);
  return {
    templates: templates,
    templateDef: templateDef
  }
}

describe('Template converter', function() {

  it('should handle basic template conversion', function() {
    var parseData = _parseTemplate('<replacedhtml><replacedhead></replacedhead><repleacedbody><div data-ko-container="main"><div data-ko-block="simpleBlock"><div data-ko-editable="text">block1</div></div></div></replacedbody></replacedhtml>');

    var expectedTemplates = [{
      optionalName: 'template',
      templateMode: 'show',
      html: '<replacedhtml><replacedhead></replacedhead><repleacedbody><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>'
    }, {
      optionalName: 'simpleBlock',
      templateMode: 'show',
      html: '<div data-bind="attr: { id: id }, uniqueId: $data"><div data-bind="wysiwygId: id()+&apos;_text&apos;, wysiwygClick: function(obj, evt) { $root.selectItem(text, $data); return false }, clickBubble: false, wysiwygCss: { selecteditem: $root.isSelectedItem(text) }, scrollIntoView: $root.isSelectedItem(text), wysiwygOrHtml: text"></div></div>'
    }];

    expect(parseData.templates).toEqual(expectedTemplates);

    var modelDef = require('../src/js/converter/model.js');
    var model = modelDef.generateResultModel(parseData.templateDef);

    var expectedModel = {
      type: 'template',
      mainBlocks: {
        type: 'blocks',
        blocks: []
      },
      theme: {
        type: 'theme',
        bodyTheme: null
      }
    };

    expect(model).toEqual(expectedModel);

    // TODO verify template "defs" output
    // console.log("RESULT", templateDef);
  });

  it('should handle versafix-1 template conversion', function() {
    var modelDef = require('../src/js/converter/model.js');
    var translateTemplate = require('../src/js/converter/parser.js');
    var templates = [];
    var $ = require('jquery');
    var myTemplateCreator = function(htmlOrElement, optionalName, templateMode) {
      templates.push({
        optionalName: optionalName,
        templateMode: templateMode,
        html: typeof htmlOrElement == 'object' ? $.html(htmlOrElement) : htmlOrElement
      });
    };

    var fs = require('fs');

    var templatecode = "" + fs.readFileSync("spec/data/template-versafix-1.html");
    var res = templatecode.match(/^([\S\s]*)([<]html[^>]*>[\S\s]*<\/html>)([\S\s]*)$/i);
    if (res === null) throw "Unable to find <html> opening and closing tags in the template";
    var html = res[2].replace(/(<\/?)(html|head|body)([^>]*>)/gi, function(match, p1, p2, p3) {
      return p1 + 'replaced' + p2 + p3;
    });

    var templateDef = translateTemplate('template', html, templateUrlConverter, myTemplateCreator);
    var model = modelDef.generateResultModel(templateDef);

    var expectedModel = JSON.parse("" + fs.readFileSync("spec/data/template-versafix-1.model.json"));

    expect(model).toEqual(expectedModel);
  });

  // we should call the viewModel.js conditional_restore (or better move that code elsewhere)
  function conditional_restore(html) {
    return html.replace(/<replacedcc[^>]* condition="([^"]*)"[^>]*>([\s\S]*?)<\/replacedcc>/g, function(match, condition, body) {
      var dd = '<!--[if '+condition.replace(/&amp;/, '&')+']>';
      dd += body.replace(/(<\/cc>)?<!-- cc:ac:([A-Za-z:]*) -->/g, '</$2>') // restore closing tags (including lost tags)
            .replace(/><!-- cc:sc -->/g, '/>') // restore selfclosing tags
            .replace(/<!-- cc:bo:([A-Za-z:]*) --><cc/g, '<$1') // restore open tags
            .replace(/^.*<!-- cc:start -->/,'') // remove content before start
            .replace(/<!-- cc:end -->.*$/,''); // remove content after end
      dd += '<![endif]-->';
      return dd;
    });
  }

  it('should handle conditional comments', function() {
    var parseData = _parseTemplate('<replacedhtml><replacedhead>\
        <style type="text/css">\
    @supports -ko-blockdefs {\
      text { label: Paragraph; widget: text }\
      url { label: Link; widget: url }\
      template { label: Page; }\
}\
  </style>\
      </replacedhead><repleacedbody><!--[if mso]>\n\
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://www.link.com/" \
  target="_blank" style="-ko-attr-href: @url" fillcolor="#ffffff">\n\
    <w:anchorlock/>\n\
    <center style="color: #001e50; font-family: Arial, sans-serif;font-size:12px;" style="-ko-bind-html: @text">\n\
      Some text\n\
    </center>\n\
  </v:roundrect>\n\
  <![endif]--><div data-ko-container="main"></div></replacedbody></replacedhtml>');

    var expectedTemplates = [{
      optionalName: 'template',
      templateMode: 'show',
      html: '<replacedhtml><replacedhead></replacedhead><repleacedbody><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>'
    }];

    
    var expectedTemplates = [{ 
      optionalName: 'template',
      templateMode: 'show',
      html: '<replacedhtml><replacedhead>              </replacedhead><repleacedbody><replacedcc condition="mso" style="display: none">\n\
  <!-- cc:bo:v:roundrect --><cc xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" target="_blank" fillcolor="#ffffff" data-bind="wysiwygHref: url, virtualAttr: {  }">\n\
    <!-- cc:bo:w:anchorlock --><cc><!-- cc:sc -->\n\
    <!-- cc:bo:center --><cc data-bind="html: text">\n\
      Some text\n\
    </cc><!-- cc:ac:center -->\n\
  </cc><!-- cc:ac:v:roundrect -->\n\
  <!-- cc:end --></cc></replacedcc><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>' 
    }];

    expect(parseData.templates).toEqual(expectedTemplates);

    var restoredHTML = conditional_restore(expectedTemplates[0].html);
    expect(restoredHTML).toEqual('<replacedhtml><replacedhead>              </replacedhead><repleacedbody><!--[if mso]>\n\
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" target="_blank" fillcolor="#ffffff" data-bind="wysiwygHref: url, virtualAttr: {  }">\n\
    <w:anchorlock/>\n\
    <center data-bind="html: text">\n\
      Some text\n\
    </center>\n\
  </v:roundrect>\n\
  <![endif]--><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>');
  });


  it('should handle conditional comments with wrapping', function() {
    var parseData = _parseTemplate('<replacedhtml><replacedhead>\
        <style type="text/css">\
    @supports -ko-blockdefs {\
      text { label: Paragraph; widget: text }\
      url { label: Link; widget: url }\
      template { label: Page; }\
}\
  </style>\
      </replacedhead><repleacedbody><!--[if mso]>\n\
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" data-ko-link="url" href="https://www.link.com/" \
  target="_blank" fillcolor="#ffffff">\n\
    <w:anchorlock/>\n\
    <center style="color: #001e50; font-family: Arial, sans-serif;font-size:12px;" style="-ko-bind-html: @text">\n\
      Some text\n\
    </center>\n\
  </v:roundrect>\n\
  <![endif]--><div data-ko-container="main"></div></replacedbody></replacedhtml>');

    var expectedTemplates = [{
      optionalName: 'template',
      templateMode: 'show',
      html: '<replacedhtml><replacedhead></replacedhead><repleacedbody><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>'
    }];


    var expectedTemplates = [{
      optionalName: undefined,
      templateMode: undefined,
      html: '\n\
    <!-- cc:bo:w:anchorlock --><cc><!-- cc:sc -->\n\
    <!-- cc:bo:center --><cc data-bind="html: text">\n\
      Some text\n\
    </cc><!-- cc:ac:center -->\n\
  </cc><!-- cc:ac:v:roundrect -->\n\
  <!-- cc:end -->'
    },{
      optionalName: undefined,
      templateMode: undefined,
      html: '<cc xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" target="_blank" fillcolor="#ffffff" data-bind="wysiwygHref: url, virtualAttr: {  }"><!-- ko template: \'undefined\' --><!-- /ko --></cc>' 
    },{
      optionalName: 'template',
      templateMode: 'show',
      html: '<replacedhtml><replacedhead>              </replacedhead><repleacedbody><replacedcc condition="mso" style="display: none">\n\
  <!-- cc:bo:v:roundrect --><!-- ko template: (typeof templateMode != \'undefined\' && templateMode == \'wysiwyg\') || url() ? \'undefined\' : \'undefined\' --><!-- /ko --></replacedcc><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>' 
    }];

    expect(parseData.templates).toEqual(expectedTemplates);

    var composedHTML = expectedTemplates[2].html.replace('<!-- ko template: (typeof templateMode != \'undefined\' && templateMode == \'wysiwyg\') || url() ? \'undefined\' : \'undefined\' --><!-- /ko -->', 
      expectedTemplates[1].html.replace('<!-- ko template: \'undefined\' --><!-- /ko -->', expectedTemplates[0].html));


    var restoredHTML = conditional_restore(composedHTML);
    expect(restoredHTML).toEqual('<replacedhtml><replacedhead>              </replacedhead><repleacedbody><!--[if mso]>\n\
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" target="_blank" fillcolor="#ffffff" data-bind="wysiwygHref: url, virtualAttr: {  }">\n\
    <w:anchorlock/>\n\
    <center data-bind="html: text">\n\
      Some text\n\
    </center>\n\
  </v:roundrect>\n\
  <![endif]--><div data-bind="block: mainBlocks"></div></repleacedbody></replacedhtml>');

  });


});
