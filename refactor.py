import re
import sys

def refactor_code(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    # db.prepare("SQL").all(args) -> (await db.execute({ sql: "SQL", args: [args] })).rows
    code = re.sub(r'db\.prepare\((.*?)\)\.all\(([^)]+)\)', r'(await db.execute({ sql: \1, args: [\2] })).rows', code)
    
    # db.prepare("SQL").all() -> (await db.execute(\1)).rows
    code = re.sub(r'db\.prepare\((.*?)\)\.all\(\)', r'(await db.execute(\1)).rows', code)
    
    # db.prepare("SQL").get(args) -> (await db.execute({ sql: "SQL", args: [\2] })).rows[0]
    code = re.sub(r'db\.prepare\((.*?)\)\.get\(([^)]+)\)', r'(await db.execute({ sql: \1, args: [\2] })).rows[0]', code)
    
    # db.prepare("SQL").get() -> (await db.execute(\1)).rows[0]
    code = re.sub(r'db\.prepare\((.*?)\)\.get\(\)', r'(await db.execute(\1)).rows[0]', code)
    
    # db.prepare("SQL").run(args) -> await db.execute({ sql: "SQL", args: [\2] })
    code = re.sub(r'db\.prepare\((.*?)\)\.run\(([^)]+)\)', r'await db.execute({ sql: \1, args: [\2] })', code)
    
    # db.prepare("SQL").run() -> await db.execute(\1)
    code = re.sub(r'db\.prepare\((.*?)\)\.run\(\)', r'await db.execute(\1)', code)

    # Some manual fixes for getCached
    code = code.replace('() => {', 'async () => {')
    code = code.replace('function generateLegs()', 'async function generateLegs()')
    code = code.replace('function generateCombis()', 'async function generateCombis()')
    code = code.replace('const legs = generateLegs()', 'const legs = await generateLegs()')
    code = code.replace('const combis = generateCombis()', 'const combis = await generateCombis()')
    code = code.replace('const pool = generateLegs()', 'const pool = await generateLegs()')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(code)
    
    print(f"Refactored {filepath}")

for arg in sys.argv[1:]:
    refactor_code(arg)
