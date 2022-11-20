//we use anonymous functions to encapsulate these and avoid polluting TypeScript namespace
//because TypeScript does not know these will be run in a separate context
(() => 
{
	var linkNodes = document.links;
	var links: page_link[] = [];

	for(let i=0; i<linkNodes.length; i++)
	{
		let link = Utils.parseLink(linkNodes[i]);
		links.push(link);
	}

	var originPageUrl = window.location.href;
	var originPageReferer = document.referrer;
	var result: extracted_links = {
		links: links,
		originPageUrl: originPageUrl,
		originPageReferer: originPageReferer,
	};

	return result;
})();