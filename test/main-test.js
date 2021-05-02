let chai = require('chai');
let chaiHttp = require('chai-http');
let app = require('../server.js');

chai.use(chaiHttp);
let assert = chai.assert;


describe('Basic test',() => {
    it('1', () => {
        chai.request(app)
        .get("/")
        .end((err, res) => {
            assert.equal(200, res.status);
            assert.deepEqual("<h1>Up and running. + CI/CD</h1>", res.text);
        });
    })
    it('2', () => {
        chai.request(app)
        .get("/")
        .end((err, res) => {
            assert.equal(300, res.status);
        });
    })
})