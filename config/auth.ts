export default (await import('../auth.json', { assert: { type: 'json' } })).default;
