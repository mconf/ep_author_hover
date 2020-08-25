var _ = require('ep_etherpad-lite/static/js/underscore');
var padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;

var timer = 0;

exports.postAceInit = function(hook_name, context){
  showAuthor.enable(context);
  clientVars.plugins.plugins.ep_author_hover = {};
  /* init */
  if (padcookie.getPref("author-hover") === false) {
    $('#options-author-hover').val();
    $('#options-author-hover').attr('checked','unchecked');
    $('#options-author-hover').attr('checked',false);
  }else{
    $('#options-author-hover').attr('checked','checked');
  }

  if($('#options-author-hover').is(':checked')) {
    clientVars.plugins.plugins.ep_author_hover.enabled = true;
  } else {
    clientVars.plugins.plugins.ep_author_hover.enabled = false;
  }

  /* on click */
  $('#options-author-hover').on('click', function() {
   if($('#options-author-hover').is(':checked')) {
      clientVars.plugins.plugins.ep_author_hover.enabled = true;
      padcookie.setPref("author-hover", true)
    } else {
      padcookie.setPref("author-hover", false)
      clientVars.plugins.plugins.ep_author_hover.enabled = false;
    }
  });

}

var showAuthor = {
  enable: function(context){
    context.ace.callWithAce(function(ace){
      var doc = ace.ace_getDocument();
      $(doc).find('#innerdocbody').mousemove(_(exports.showAuthor.hover).bind(ace));
    }, 'showAuthor', true);
  },
  disable: function(context){
    context.ace.callWithAce(function(ace){
      var doc = ace.ace_getDocument();
      $(doc).find('#innerdocbody').mousemove(_().bind(ace));
    }, 'showAuthor', true);
  },
  hover: function(span){
    if(timer) { // wait half a second before showing!
      clearTimeout(timer);
      timer = null;
    }
    timer = setTimeout(function(){
      showAuthor.show(span);
    }, 500);

  },
  show: function(span){
    if(clientVars.plugins.plugins.ep_author_hover.enabled){
      var authorTarget = $(span.target).closest('span')[0];
      if (!authorTarget){ return; } // We might not be over a valid target
      var authorId = showAuthor.authorIdFromClass(authorTarget.className); // Get the authorId
      if(!authorId){ return; } // Default text isn't shown
      showAuthor.destroy(); // Destroy existing
      var authorNameAndColor = showAuthor.authorNameAndColorFromAuthorId(authorId); // Get the authorName And Color
      showAuthor.draw(span, authorNameAndColor.name, authorNameAndColor.color);
    }
  },
  authorIdFromClass: function(className){
    if (className.substring(0, 7) == "author-") {
      className = className.substring(0,49);
      return className.substring(7).replace(/[a-y0-9]+|-|z.+?z/g, function(cc) {
        if (cc == '-') { return '.'; }
        else if (cc.charAt(0) == 'z') {
          return String.fromCharCode(Number(cc.slice(1, -1)));
        }
        else {
          return cc;
        }
      });
    }
  },
  authorNameAndColorFromAuthorId: function(authorId){
    var offWhite = "#f3f6f9";
    var fullAuthorId = authorId; // historical data uses full author id without substing
    // todo figure out why we need a substring to fix this
    authorId = authorId.substring(0,14); // don't ask....  something appears to be fucked in regex
    // It could always be me..
    var myAuthorId = pad.myUserInfo.userId.substring(0,14);
    if(myAuthorId == authorId){
      return {
        name: window._('ep_author_hover.me'),
        color: offWhite
      }
    }

    // Not me, let's look up in the DOM
    var authorObj = {};
    $('#otheruserstable > tbody > tr').each(function(){
      if (authorId == $(this).data("authorid").substring(0,14)){
        $(this).find('.usertdname').each( function() {
          authorObj.name = $(this).text();
          if(authorObj.name == "") authorObj.name = window._('ep_author_hover.unknow_author');
        });
        $(this).find('.usertdswatch > div').each( function() {
          authorObj.color = offWhite;
        });
        return authorObj;
      }
    });

    // Else go historical
    if(!authorObj || !authorObj.name){
      var historicalData = clientVars.collab_client_vars.historicalAuthorData;
      for (var author in historicalData) {
        if (authorId === author.substring(0, 14)) {
          authorObj.name = historicalData[author].name;
          authorObj.color = offWhite;
          break;
        }
      }
    }

    return authorObj || {name: window._('ep_author_hover.unknow_author'), color: offWhite};
  },
  draw: function(target, authorName, authorColor){
    if(!authorName){
      console.warn("No authorName, I have no idea why!  Help me debug this by providing steps to replicate!");
      return;
    }
    var span = target.target;
    var fontSize = $(span).parent().css('font-size');
    var top = span.offsetTop -14;
    if(top < 0) top = $(span).height() +14;
    var left = target.clientX +15;
    $(span).removeAttr("title");

    // TODO use qtip, it will handle edge cases better
    var outBody = $('iframe[name="ace_outer"]').contents().find("body");
    var inFrame = $(outBody).find('iframe[name="ace_inner"]');
    var inFramePos = inFrame.position();
    left += inFramePos.left;
    top += inFramePos.top;

    var $indicator = $("<div>").attr({
      class: 'authortooltip',
      title: authorName,
    }).css({
      "opacity": "1",
      "box-sizing": "border-box",
      "font-size": "14px",
      "padding": "5px",
      "position": "absolute",
      "left": left + "px",
      "top": top + "px",
      "background-color": authorColor,
    }).text(authorName);

    $(outBody).append($indicator);

    // After a while, fade out
    setTimeout(function(){
      $indicator.fadeOut(500, function(){
        $indicator.remove();
      });
    }, 1000);
  },
  destroy: function(){
    $('iframe[name="ace_outer"]').contents().find(".authortooltip").remove();
  }
}

exports.showAuthor = showAuthor;
