//all global variables should be declared with 'var'
//because if we run the script twice we will get 'redeclaration' error if we use 'let'

var selection = document.getSelection();
//@ts-ignore
var linkNodes = Array.from(document.links).filter(e => selection?.containsNode(e, true) && e.href.match(/^https?:/i));

var links: ContextMenu.link[] = [];

for(let i=0; i<linkNodes.length; i++)
{
	let linkNode = linkNodes[i];
	let isAnchor = (linkNode instanceof HTMLAnchorElement);
	let desc = (isAnchor)? 
		//@ts-ignore
		(linkNode.title || linkNode.textContent) : (linkNode.alt || linkNode.title);
	let href = linkNode.href;
	let link: ContextMenu.link = {href: href, desc: desc};
	links.push(link);
}

var originPageUrl = window.location.href;
var originPageReferer = document.referrer;
var result: ContextMenu.result = {
	links: links,
	originPageUrl: originPageUrl,
	originPageReferer: originPageReferer,
};

result;
