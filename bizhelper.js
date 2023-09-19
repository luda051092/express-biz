const slugify = require('slugify');

// *return slug of privided name
// * @param {*} name
// * @returns

function slugifyCode(name) {
    return slugify(name, {
        replacement: '-', 
        remove: /[*+~.()'"!:@]/g,
        lower: true,
        strict: true
    });
}

// set industries of company
// * @param {*} db
// * @param {*} comp_code
// * @param {*} indu_codes
// * @returns

async function setIndustries(db, comp_code, indu_codes) {
    const result = await db.query('DELETE FROM companies_industries WHERE comp_code = $1', [comp_code]);

    if (indu_codes !== undefined && indu_codes.length > 0) {
        const values = indu_codes.map((code, index) => `($1 , $${index + 2})`).join(',');

        const results = await db.query(`INSERT INTO companies_industries VALUES ${values}
            RETURNING indu_code` , [comp_code, ...indu_codes]);
        
            return results.rows.map(r => r.indu_code);

    }
    return [];

}

module.exports = {
    slugifyCode: slugifyCode,
    setIndustries: setIndustries
}