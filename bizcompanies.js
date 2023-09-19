const express = require('express');
const router = new express.Router();
const { slugifyCode, setIndustries } = require('./helper');


const ExpressError = require('../expressError');
const db = require('../db');

// returns list of companies; {companies: [{code, name}, ...]}

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query('SELECT code , name FROM companies');

        return res.json({ companies: results.rows });
    } catch (err) {
        next(err);
    }
});

// Return obj of company {company: {code, name, description, indistries: [{code , industry} , ...] invoices: [id, ...]}}
// if not found, return 404 status response

router.get('/:code', async (req, res, next) => {
    try {
        const results = await db.query(
            'SELECT code , name , description FROM companies WHERE code = $1',
            [req.params.code]);


        if (results.rows.length === 0) {
            throw new ExpressError(`company with code ${req.params.code} can not be found`, 404);

        }

        const industries = await db.query(`
        SELECT
            code , industry
        FROM 
            industries INNER JOIN companies_industries ON code = indu_code
        WHERE
            comp_code = $1` , [req.params.code]);



        const invoices = await db.query(`
        SELECT
            id, comp_code, amt, paid, add_date, paid_date
        FROM
            invoices
        WHERE
            comp_code = $1` , [req.params.code])

        const company = results.rows[0];
        company.industries = industries.rows;
        company.invoices = invoices.rows;

        return res.json({company});
    } catch (err) {
        next(err);
    }
});

// adds a company. returns obj of new company {company: {code, name, description}}

router.post('/', async (req, res, next) => {
    try {
        if (req.body.name === undefined ||
            req.body.name.length === 0) {

                throw new ExpressError('name is required', 400);
            }

            const code = slugifyCode(req.body.name);

            const results = await db.query(
                `
                INSERT INTO companies
                    (code , name ,  description)
                VALUES
                    ($1 , $2 , $3)
                RETURNING code, name, description` , 
                [code, req.body.name, req.body.description]);

            if (results.rows.length === 0) {
                throw new ExpressError('Error when creating new company', 500);
            }


            const company = results.rows[0];

            company.indu_codes = await setIndustries(db, company.code, req.body.indu_codes);

            return res.status(201).json({ company: company });
        } catch (err) {
            next(err);
        }
});

// editing existing companies; should return 404 if company not found. 
// returns update company object: {company: {code, name, description}}

router.put('/:code', async (req, res, next) => {
    try {
        if (req.body.name === undefined ||
            req.body.name.length === 0) {

            throw new ExpressError('name is required', 400);
        }

        const results = await db.query(
            `
            UPDATE companies
            SET
                name = $2 , 
                description = $3
            WHERE
                code = $1
            RETURNING code, name, description` , 
            [req.params.code, req.body.name, req.body.description]);

        if (results.rows.length === 0) {
            throw new ExpressError(`company with code ${req.params.code} can not be found`, 404);
        }

        const company = results.rows[0];

        company.indu_codes = await setIndustries(db, req.params.code, req.body.indu_codes);

        return res.json({ company: company });
    } catch (err) {
        next(err);
    }
});

// delete a company. Return 404 if company not found. Return {status: "deleted"}

router.delete('/:code', async (req, res, next) => {
    try {
        const results = await db.query(
            `DELETE FROM companies WHERE code = $1
             RETURNING code`,
             [req.params.code]);
        
        if (results.rows.length === 0) {
           throw new ExpressError(`company with code ${req.params.code} can not be found`, 404);
        }

        return res.json({ status: "deleted"});
    } catch (err) {
        next(err);
    }
});


module.exports = router;