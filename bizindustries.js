const express = require('express');
const router = new express.Router();
const { slugifyCode } = require('./helper');


const ExpressError = require('../expressError');
const db = require('../db');

// Returns list of industries, like {industries: [{code, industry}...]}

router.get('/', async (req, res, next) => {
    try {
        const industriesResults = await db.query(`SELECT code , industry FROM industries`);
        const companiesResults = await db.query(`
            SELECT indu_code , code , name
            FROM
                companies_industries JOIN companies ON comp_code = code 
            `);

        const industries = industriesResults.rows.map(r => {
            r.companies = companiesResults.rows
                .filter(c => (c.indu_code === r.code))
                .map(comp => ({code: comp.code , name: comp.name}));
            return r;
        });

        return res.json({ industries: industries });
    } catch (err) {
        next(err);
    }
});


// Return obj of industry {industry: {code, industry, companies: [code , name]}}
// if the industry cannot be found, return 404 status response. 

router.get('/:code', async (req, res, next) => {
    try {
        const results = await db.query(
            'SELECT code , industry FROM industries WHERE code = $1',
            [req.params.code]);

        
        if (results.rows.length === 0) {
            throw new ExpressError(`industry with code ${req.params.code} cannot be found`, 404);

        }

        const companies = await db.query(`
        SELECT
            code , name
        FROM
            companies INNER JOIN companies_industries ON comp_code = code
        WHERE
            indu_code = $1` , [req.params.code])

        const { code, industry } = results.rows[0];

        return res.json({
            industry:
            {
                code, industry,
                companies: companies.rows
            }
        });
    } catch (err) {
        next(err);
    }
});

// Add an industry. Returns obj of new industry {industry: {code, industry}}

router.post('/', async (req, res, next) => {
    try {
        if (req.body.industry === undefined ||
            req.body.industry.length === 0) {

                throw new ExpressError('industry is required', 400);

            }

            const code = slugifyCode(req.body.industry);

            const results = await db.query(
                `
                INSERT INTO industries
                    (code , industry)
                VALUES
                    ($1 , $2)
                RETURNING code, industry` , 
                [code, req.body.industry]);

            return res.status(201).json({ industry: results.rows[0] });
        } catch (err) {
            next(err);
        }
});

// Edit existing industry, return 404 if industry not found.
//Returns update industry object: {industry: {code, industry, description}}

router.put('/:code', async (req, res, next) => {
    try {
        if (req.body.industry === undefined ||
            req.body.industry.length === 0) {

            throw new ExpressError('industry is required', 400);
        }

        const results = await db.query(
            `
            UPDATE industries
            SET 
                industry = $2
            WHERE
                code = $1
            RETURNING code, industry` ,
            [req.params.code, req.body.industry]);

        if (results.rows.length === 0) {
            throw new ExpressError(`industry with code ${req.params.code} can not be found`, 404);

        }

        return res.json({ industry: results.rows[0] });
    } catch (err) {
        next(err);
    }
});

// deletes industry. Returns 404 if industry not found. 
// returns {status: "deleted"}

router.delete('/:code', async (req, res, next) => {
    try {
        const results = await db.query(
            `DELETE FROM industries WHERE code = $1
             RETURNING code`,
             [req.params.code]);
        
        if (results.rows.length === 0) {
            throw new ExpressError(`industry with code ${req.params.code} cannot be found`, 404);
        }

        return res.json({ status: "deleted" });
    } catch (err) {
        next(err);
    } 
});


module.exports = router;