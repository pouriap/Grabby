namespace log
{
	export let DEBUG = true;

	export var d = (DEBUG === true)? console.log.bind(window.console): ()=>{};

	export var warn = (DEBUG === true)? console.warn.bind(window.console): ()=>{};

	export function err(...args: any[]): never
	{
		//if it's just a simple error message
		if(args.length === 1 && typeof args[0] === 'string')
		{
			throw Error(args[0]);
		}

		//if it's a message and an object
		if(args.length === 2 && typeof args[0] === 'string')
		{
			console.error(args[1]);
			throw Error(args[0]);
		}

		//if not then just do a generic dump
		args.forEach((arg) => {
			console.error(arg);
		});
		throw Error('An error occured, see above for details');
	}
}