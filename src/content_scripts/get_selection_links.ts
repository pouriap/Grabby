//we use anonymous functions to encapsulate these and avoid polluting TypeScript namespace
//because TypeScript does not know these will be run in a separate context
(() => 
{
	let selection = document.getSelection();
	let linkNodes = Array.from(document.links).filter(e => selection?.containsNode(e, true) && e.href.match(/^https?:/i));
	
	let links: page_link[] = [];
	
	for(let i=0; i<linkNodes.length; i++)
	{
		let link = Utils.parseLink(linkNodes[i]);
		links.push(link);
	}
	
	let originPageUrl = window.location.href;
	let originPageReferer = document.referrer;
	let result: ContextMenu.result = {
		links: links,
		originPageUrl: originPageUrl,
		originPageReferer: originPageReferer,
	};
	
	return result;
})();