//all global variables should be declared with 'var'
//because if we run the script twice we will get 'redeclaration' error if we use 'let'

var links = [];
var isAnchor = (linkNode instanceof HTMLAnchorElement);
var description = (isAnchor)? 
	(linkNode.title || linkNode.textContent) : (linkNode.alt || linkNode.title);
var href = linkNode.href;
var link = {href: href, description: description};
links.push(link);
var originPageUrl = window.location.href;
var originPageDomain = window.location.hostname;
var originPageReferer = document.referrer;
var result = {
	links: links,
	originPageUrl: originPageUrl,
	originPageDomain: originPageDomain,
	originPageReferer: originPageReferer,
};
result;