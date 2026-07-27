// Get Parameters from some url
var getUrlParameter = function getUrlParameter(sPageURL) {
<<<<<<< HEAD
  var url = sPageURL.split("?");
  var obj = {};
  if (url.length == 2) {
    var sURLVariables = url[1].split("&"),
      sParameterName,
      i;
    for (i = 0; i < sURLVariables.length; i++) {
      sParameterName = sURLVariables[i].split("=");
      obj[sParameterName[0]] = sParameterName[1];
    }
    return obj;
  } else {
    return undefined;
  }
=======
    var url = sPageURL.split('?');
    var obj = {};
    if (url.length == 2) {
      var sURLVariables = url[1].split('&'),
          sParameterName,
          i;
      for (i = 0; i < sURLVariables.length; i++) {
          sParameterName = sURLVariables[i].split('=');
          obj[sParameterName[0]] = sParameterName[1];
      }
    }
    return obj;
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
};

// Execute actions on images generated from Markdown pages
var images = $("div#body-inner img").not(".inline");
// Wrap image inside a featherlight (to get a full size view in a popup)
<<<<<<< HEAD
images.wrap(function () {
  var image = $(this);
  var o = getUrlParameter(image[0].src);
  var f = o["featherlight"];
  // IF featherlight is false, do not use feather light
  if (f != "false") {
=======
images.wrap(function(){
  var image =$(this);
  var o = getUrlParameter(image[0].src);
  var f = o['featherlight'];
  // IF featherlight is false, do not use feather light
  if (f != 'false') {
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
    if (!image.parent("a").length) {
      return "<a href='" + image[0].src + "' data-featherlight='image'></a>";
    }
  }
});

// Change styles, depending on parameters set to the image
<<<<<<< HEAD
images.each(function (index) {
  var image = $(this);
=======
images.each(function(index){
  var image = $(this)
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
  var o = getUrlParameter(image[0].src);
  if (typeof o !== "undefined") {
    var h = o["height"];
    var w = o["width"];
    var c = o["classes"];
<<<<<<< HEAD
    image.css("width", function () {
=======
    image.css("width", function() {
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
      if (typeof w !== "undefined") {
        return w;
      } else {
        return "auto";
      }
    });
<<<<<<< HEAD
    image.css("height", function () {
=======
    image.css("height", function() {
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
      if (typeof h !== "undefined") {
        return h;
      } else {
        return "auto";
      }
    });
    if (typeof c !== "undefined") {
<<<<<<< HEAD
      var classes = c.split(",");
=======
      var classes = c.split(',');
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
      for (i = 0; i < classes.length; i++) {
        image.addClass(classes[i]);
      }
    }
  }
});

// Stick the top to the top of the screen when  scrolling
<<<<<<< HEAD
$(document).ready(function () {
  $("#top-bar").sticky({ topSpacing: 0, zIndex: 1000 });
});

jQuery(document).ready(function () {
  // Add link button for every
  var text,
    clip = new ClipboardJS(".anchor");
  $("h1~h2,h1~h3,h1~h4,h1~h5,h1~h6").append(function (index, html) {
    var element = $(this);
    var url = encodeURI(document.location.origin + document.location.pathname);
    var link = url + "#" + element[0].id;
    return (
      " <span class='anchor' data-clipboard-text='" +
      link +
      "'>" +
      "<i class='fas fa-link fa-lg'></i>" +
      "</span>"
    );
  });

  $(".anchor").on("mouseleave", function (e) {
    $(this)
      .attr("aria-label", null)
      .removeClass("tooltipped tooltipped-s tooltipped-w");
  });

  clip.on("success", function (e) {
    e.clearSelection();
    $(e.trigger)
      .attr("aria-label", "Link copied to clipboard!")
      .addClass("tooltipped tooltipped-s");
  });
  $("code.language-mermaid").each(function (index, element) {
    var content = $(element).html().replace(/&amp;/g, "&");
    $(element)
      .parent()
      .replaceWith('<div class="mermaid" align="center">' + content + "</div>");
=======
$(document).ready(function(){
  $("#top-bar").sticky({topSpacing:0, zIndex: 1000});
});


jQuery(document).ready(function() {
  // Add link button for every
  var text, clip = new ClipboardJS('.anchor');
  $("h1~h2,h1~h3,h1~h4,h1~h5,h1~h6").append(function(index, html){
    var element = $(this);
    var url = encodeURI(document.location.origin + document.location.pathname);
    var link = url + "#"+element[0].id;
    return " <span class='anchor' data-clipboard-text='"+link+"'>" +
      "<i class='fas fa-link fa-lg'></i>" +
      "</span>"
    ;
  });

  $(".anchor").on('mouseleave', function(e) {
    $(this).attr('aria-label', null).removeClass('tooltipped tooltipped-s tooltipped-w');
  });

  clip.on('success', function(e) {
      e.clearSelection();
      $(e.trigger).attr('aria-label', 'Link copied to clipboard!').addClass('tooltipped tooltipped-s');
  });
  $('code.language-mermaid').each(function(index, element) {
    var content = $(element).html().replace(/&amp;/g, '&');
    $(element).parent().replaceWith('<div class="mermaid" align="center">' + content + '</div>');
>>>>>>> 14f00160fe1a8798112c92f40478f57213880ddf
  });
});
