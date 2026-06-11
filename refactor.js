const fs = require('fs');

function refactorFile(filepath) {
    let code = fs.readFileSync(filepath, 'utf8');

    // await getDb() fixes
    code = code.replace(/const db = getDb\(\);/g, 'const db = await getDb();');

    // db.prepare("SQL").all(args) -> (await db.execute({ sql: "SQL", args: [args] })).rows
    code = code.replace(/db\.prepare\((.*?)\)\.all\(([^)]+)\)/g, '(await db.execute({ sql: $1, args: [$2] })).rows');
    
    // db.prepare("SQL").all() -> (await db.execute(\1)).rows
    code = code.replace(/db\.prepare\((.*?)\)\.all\(\)/g, '(await db.execute($1)).rows');
    
    // db.prepare("SQL").get(args) -> (await db.execute({ sql: "SQL", args: [\2] })).rows[0]
    code = code.replace(/db\.prepare\((.*?)\)\.get\(([^)]+)\)/g, '(await db.execute({ sql: $1, args: [$2] })).rows[0]');
    
    // db.prepare("SQL").get() -> (await db.execute(\1)).rows[0]
    code = code.replace(/db\.prepare\((.*?)\)\.get\(\)/g, '(await db.execute($1)).rows[0]');
    
    // db.prepare("SQL").run(args) -> await db.execute({ sql: "SQL", args: [\2] })
    code = code.replace(/db\.prepare\((.*?)\)\.run\(([^)]+)\)/g, 'await db.execute({ sql: $1, args: [$2] })');
    
    // db.prepare("SQL").run() -> await db.execute(\1)
    code = code.replace(/db\.prepare\((.*?)\)\.run\(\)/g, 'await db.execute($1)');

    // Some manual fixes for getCached
    code = code.replace(/function generateLegs\(\)/g, 'async function generateLegs()');
    code = code.replace(/function generateCombis\(\)/g, 'async function generateCombis()');
    code = code.replace(/const legs = generateLegs\(\)/g, 'const legs = await generateLegs()');
    code = code.replace(/const combis = generateCombis\(\)/g, 'const combis = await generateCombis()');
    code = code.replace(/const pool = generateLegs\(\)/g, 'const pool = await generateLegs()');
    code = code.replace(/getCached\(/g, 'await getCachedAsync(');

    fs.writeFileSync(filepath, code, 'utf8');
    console.log('Refactored ' + filepath);
}

process.argv.slice(2).forEach(refactorFile);
