var linkNodes = document.links;
var links = [];
for(let linkNode of linkNodes){
	let isAnchor = (linkNode instanceof HTMLAnchorElement);
	let description = (isAnchor)? 
		(linkNode.title || linkNode.textContent) : (linkNode.alt || linkNode.title);
	let href = linkNode.href;
	let link = {href: href, description: description};
	links.push(link);
}
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