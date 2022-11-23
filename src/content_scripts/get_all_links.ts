//we use anonymous functions to encapsulate these and avoid polluting TypeScript namespace
//because TypeScript does not know these will be run in a separate context
(() => 
{
	var linkNodes = document.links;
	var links: page_link[] = [];
	var len = linkNodes.length;
	var addedHrefs: string[] = [];

	for(let i=0; i<len; i++)
	{
		let link = Utils.parseLink(linkNodes[i]);

		//don't get duplicate links
		if(addedHrefs.includes(link.href)) continue;

		links.push(link);
		addedHrefs.push(link.href);
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