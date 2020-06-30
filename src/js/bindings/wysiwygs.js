"use strict";
/* global global: false, Image: false */

var tinymce = require("tinymce");
var $ = require("jquery");
var ko = require("knockout");
var console = require("console");
require("./eventable.js");

ko.bindingHandlers.wysiwygOrHtml = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');

    if (isNotWysiwygMode)
      return ko.bindingHandlers['virtualHtml'].init();
    else
      return ko.bindingHandlers.wysiwyg.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (isNotWysiwygMode)
      return ko.bindingHandlers['virtualHtml'].update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
    //else 
    //  return ko.bindingHandlers.wysiwyg.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygOrHtml'] = true;

ko.bindingHandlers.wysiwygHref = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (element.nodeType !== 8) {
      var v = valueAccessor();

      var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
      // console.log("XXX", bindingContext.templateMode, isNotWysiwygMode, element.getAttribute("href"));
      if (isNotWysiwygMode) {
        element.setAttribute('target', '_new');
      } else {
        /*jshint scripturl:true*/

        var allbindings = allBindingsAccessor();
        if (typeof allbindings.wysiwygOrHtml !== 'undefined') {
          element.setAttribute('href', 'javascript:void(0)');
        } else {
          element.removeAttribute('href');
          element.setAttribute('disabledhref', '#');
        }
      }
    }
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (element.nodeType !== 8) {
      var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
      // NOTE this unwrap is needed also in "wysiwyg" mode, otherwise dependency tracking dies.
      var attrValue = ko.utils.unwrapObservable(valueAccessor());
      if (isNotWysiwygMode) {
        if ((attrValue === false) || (attrValue === null) || (attrValue === undefined))
          element.removeAttribute('href');
        else
          element.setAttribute('href', attrValue.toString());
      }
    }
  }
};
ko.virtualElements.allowedBindings['wysiwygHref'] = true;

ko.bindingHandlers.wysiwygSrc = {
  preload: true,
  preloadingClass: 'mo-preloading',
  // Version with "width x height" text
  // svg: '<svg xmlns="http://www.w3.org/2000/svg" width="__WIDTH__" height="__HEIGHT__"><defs><pattern id="pinstripe" patternUnits="userSpaceOnUse" width="56.568" height="56.568" patternTransform="rotate(135)"><line x1="28.284" y="0" x2="28.284" y2="56.568" stroke="#808080" stroke-width="28.284" /></pattern></defs><rect width="100%" height="100%" fill="#707070"/><rect width="100%" height="100%" fill="url(#pinstripe)" /><text x="50%" y="50%" font-size="20" text-anchor="middle" alignment-baseline="middle" font-family="monospace, sans-serif" fill="#B0B0B0">__TEXT__</text></svg>',
  // Stripes only
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="__WIDTH__" height="__HEIGHT__"><defs><pattern id="pinstripe" patternUnits="userSpaceOnUse" width="56.568" height="56.568" patternTransform="rotate(135)">'+
    '<line x1="14.142" y1="0" x2="14.142" y2="56.568" stroke="#808080" stroke-width="28.284" /></pattern></defs><rect width="100%" height="100%" fill="#707070"/><rect width="100%" height="100%" fill="url(#pinstripe)" /></svg>',
  convertedUrl: function(src, method, width, height) {
    var queryParamSeparator = src.indexOf('?') == -1 ? '?' : '&';
    var res = src + queryParamSeparator + "method=" + method + "&width=" + width + (height !== null ? "&height=" + height : '');
    return res;
  },
  placeholderUrl: function(plwidth, plheight, pltext) {
    var placeholdersrc = "'http://lorempixel.com/g/'+" + plwidth + "+'/'+" + plheight + "+'/abstract/'+encodeURIComponent(" + pltext + ")";
    // http://placehold.it/200x150.png/cccccc/333333&text=placehold.it#sthash.nA3r26vR.dpuf
    // placeholdersrc = "'http://placehold.it/'+"+width+"+'x'+"+height+"+'.png/cccccc/333333&text='+"+size;
    // placeholdersrc = "'"+converterUtils.addSlashes(defaultValue)+"'";
  },
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    if (ko.bindingHandlers['wysiwygSrc'].preload) $(element).data('preloadimg', new Image());
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isWysiwygMode = (typeof bindingContext.templateMode != 'undefined' && bindingContext.templateMode == 'wysiwyg');

    var valueAcc = valueAccessor();

    var srcSetter = function(src, w, h, text, isPlaceholder) {
      if (src == undefined || src == null || src == "") {
        element.removeAttribute('src');
      } else if (element.getAttribute('src') !== src) {
        if (ko.bindingHandlers['wysiwygSrc'].preload && isWysiwygMode) {
          // if we are waiting for a remote placeholder, let's generate an SVG placeholder on the clientsize!
          if (typeof ko.bindingHandlers.wysiwygSrc.svg == 'string' && isPlaceholder) {
            var svgcode = ko.bindingHandlers.wysiwygSrc.svg.replace('__WIDTH__', w).replace('__HEIGHT__', h).replace('__TEXT__', text);
            element.setAttribute('src', 'data:image/svg+xml;base64,'+global.btoa(svgcode));
          }
          if (ko.bindingHandlers['wysiwygSrc'].preloadingClass) element.classList.add(ko.bindingHandlers['wysiwygSrc'].preloadingClass);
          var img = $(element).data('preloadimg');
          img.onload = function() {
            element.setAttribute('src', src);
            if (ko.bindingHandlers['wysiwygSrc'].preloadingClass) element.classList.remove(ko.bindingHandlers['wysiwygSrc'].preloadingClass);
          };
          img.onerror = function(e) {
            console.warn('Unable to preload image', src, e);
            element.setAttribute('src', src);
            if (ko.bindingHandlers['wysiwygSrc'].preloadingClass) element.classList.remove(ko.bindingHandlers['wysiwygSrc'].preloadingClass);
          };
          img.src = src;
        } else {
          element.setAttribute('src', src);
        }
      }
    };

    var value = ko.utils.unwrapObservable(valueAcc);
    var srcValue = ko.utils.unwrapObservable(value.src);
    var placeholderValue = ko.utils.unwrapObservable(value.placeholder);
    var width = ko.utils.unwrapObservable(value.width);
    var height = ko.utils.unwrapObservable(value.height);

    var src = null;
    var w = ko.utils.unwrapObservable(placeholderValue.width);
    var h = ko.utils.unwrapObservable(placeholderValue.height);
    var text = w && h ? w+'x'+h : w ? 'w'+w : 'h'+h;
    var isPlaceholder = false;
    if ((srcValue === false) || (srcValue === null) || (srcValue === undefined) || (srcValue === '')) {
      if (typeof placeholderValue == 'object' && placeholderValue !== null) src = ko.bindingHandlers.wysiwygSrc.placeholderUrl(w, h, text);
      isPlaceholder = true;
    } else {
      var method = ko.utils.unwrapObservable(value.method);
      if (!method) method = width > 0 && height > 0 ? 'cover' : 'resize';
      src = ko.bindingHandlers.wysiwygSrc.convertedUrl(srcValue, method, width, height);
    }
    srcSetter(src, w, h, text, isPlaceholder);

    if (typeof width !== 'undefined' && width !== null) element.setAttribute("width", width);
    else element.removeAttribute("width");
    if (typeof height !== 'undefined' && height !== null) element.setAttribute("height", height);
    else element.removeAttribute("height");
  }
};

ko.bindingHandlers.wysiwygId = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      element.setAttribute('id', ko.utils.unwrapObservable(valueAccessor()));
  },
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      element.setAttribute('id', ko.utils.unwrapObservable(valueAccessor()));
  }
};
ko.virtualElements.allowedBindings['wysiwygId'] = true;

// used on editable "item" so to bind clicks only in wysiwyg mode.
ko.bindingHandlers.wysiwygClick = {
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      ko.bindingHandlers.click.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygClick'] = true;

// used on editable "item" so to bind css only in wysiwyg mode.
ko.bindingHandlers.wysiwygCss = {
  update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var isNotWysiwygMode = (typeof bindingContext.templateMode == 'undefined' || bindingContext.templateMode != 'wysiwyg');
    if (!isNotWysiwygMode)
      ko.bindingHandlers.css.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygCss'] = true;

ko.bindingHandlers.wysiwygImg = {
  makeTemplateValueAccessor: function(valueAccessor, bindingContext) {
    return function() {
      var isWysiwygMode = (typeof bindingContext.templateMode != 'undefined' && bindingContext.templateMode == 'wysiwyg');

      var modelValue = valueAccessor(),
        unwrappedValue = ko.utils.peekObservable(modelValue); // Unwrap without setting a dependency here

      // If unwrappedValue.data is the array, preserve all relevant options and unwrap again value so we get updates
      ko.utils.unwrapObservable(modelValue);

      return {
        'name': isWysiwygMode ? unwrappedValue['_editTemplate'] : unwrappedValue['_template'],
        'templateEngine': ko.nativeTemplateEngine.instance
      };
    };
  },
  'init': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    return ko.bindingHandlers['template']['init'](element, ko.bindingHandlers['wysiwygImg'].makeTemplateValueAccessor(valueAccessor, bindingContext));
  },
  'update': function(element, valueAccessor, allBindings, viewModel, bindingContext) {
    bindingContext = bindingContext['extend'](valueAccessor());
    return ko.bindingHandlers['template']['update'](element, ko.bindingHandlers['wysiwygImg'].makeTemplateValueAccessor(valueAccessor, bindingContext), allBindings, viewModel, bindingContext);
  }
};
ko.virtualElements.allowedBindings['wysiwygImg'] = true;

var _catchingFire = function(event, args) {
  try {
    return this.originalFire.apply(this, arguments);
  } catch (e) {
    console.warn("Cought  exception while firing editor event", event, e);
  }
};



// setting "forced_root_block: false" disable the default behaviour of adding a wrapper <p> when needed and this seems to fix many issues in IE.
// also, maybe we should use the "raw" only for the "before SetContent" and instead read the "non-raw" content (the raw content sometimes have data- attributes and too many ending <br> in the code)
ko.bindingHandlers.wysiwyg = {

  currentIndex: 0,
  init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

    ko.bindingHandlers.focusable.init(element);

    var value = valueAccessor();
    var noLinkElement = false;
    var tagName = $(element).prop("tagName").toLowerCase();
    if(tagName === 'a' || tagName === 'span') {
      noLinkElement = true;
    }

    if (!ko.isObservable(value)) throw "Wysiwyg binding called with non observable";
    if (element.nodeType === 8) throw "Wysiwyg binding called on virtual node, ignoring...." + element.innerHTML;

    var selectorId = element.getAttribute('id');
    if (!selectorId) {
      selectorId = 'wysiwyg_' + (++ko.bindingHandlers['wysiwyg'].currentIndex);
      element.setAttribute('id', selectorId);
    }

    // Allow CKEditor to edit inside buttons and titles
    CKEDITOR.dtd.$editable['a'] = true;
    CKEDITOR.dtd.$editable['span'] = true;

    // Remove some buttons from toolbar
    CKEDITOR.config.removeButtons = 'Image,SelectAll,Format,Font,FontSize,RemoveFormat';

    // Help CKEditor to enable toolbar buttons
    if(!$(element).attr("contentEditable")) {
      $(element).attr("contentEditable", true);
    }

    $(element).on('click', function(){
      // Create instance of CKEditor
      var editor = CKEDITOR.instances[selectorId];
      if (!editor) {
        CKEDITOR.inline(selectorId);
        editor = CKEDITOR.instances[selectorId];
      }

      // Disable Link and Unlink buttons for tags <a>, <span> because
      // all links for blocks wih this tags are driven by Mosaico tools
      if(noLinkElement) {
        editor.config.removeButtons = 'Image,SelectAll,Link,Unlink,Format,Font,FontSize,RemoveFormat';
      }

      // Change item value with changes at CKEditor instance
      editor.on('blur', function() {
        value(editor.getData());
      });
    });

    ko.computed(function() {
      var content = ko.utils.unwrapObservable(valueAccessor());
      try {
        // we failed setting contents in other ways...
        // $(element).html(content);
        ko.utils.setHtml(element, content);
      } catch (e) {
        console.log("TODO exception setting content to editable element", e);
      }
    }, null, {
      disposeWhenNodeIsRemoved: element
    });

    // do not parse html content for KO bindings!!
    return {
      controlsDescendantBindings: true
    };
  },
};
