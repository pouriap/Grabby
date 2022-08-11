namespace log
{
	export let DEBUG = true;

	export function d(...args: any[])
	{
		if(!DEBUG) return;

		args.forEach((arg) => {
			console.log(arg);
		});
	}

	export function color(color: string, ...args: any[])
	{
		if(!DEBUG) return;

		args.forEach((arg) => {
			console.log(`%c${arg}`, `color:${color};`);
		});
	}

	export function warn(...args: any[])
	{
		args.forEach((arg) => {
			console.warn(arg);
		});
	}

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