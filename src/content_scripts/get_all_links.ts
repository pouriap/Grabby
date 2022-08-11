//all global variables should be declared with 'var'
//because if we run the script twice we will get 'redeclaration' error if we use 'let'

var linkNodes = document.links;
var links: context_link[] = [];

for(let i=0; i<linkNodes.length; i++)
{
	let linkNode = linkNodes[i];
	let isAnchor = (linkNode instanceof HTMLAnchorElement);
	let desc = (isAnchor)? 
		(linkNode.title || linkNode.textContent) : (linkNode.alt || linkNode.title);
	let href = linkNode.href;
	let link: context_link = {href: href, desc: desc};
	links.push(link);
}

var originPageUrl = window.location.href;
var originPageReferer = document.referrer;
var result: context_result = {
	links: links,
	originPageUrl: originPageUrl,
	originPageReferer: originPageReferer,
};

result;