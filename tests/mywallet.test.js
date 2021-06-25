import supertest from "supertest"
import app from "../src/app.js"
import connection from "../src/databaseConfig"
import bcrypt from "bcrypt";

let passwordTest=''
beforeAll(async()=>{
    passwordTest=bcrypt.hashSync('12345', 10)
    await connection.query(`INSERT INTO users
    (name, email, password)
    VALUES ('teste2','testee@gmail.com',$1)`,[passwordTest])
})
afterAll(async() => {
    await connection.query(`DELETE FROM users WHERE email=$1`,['testee@gmail.com'])
    connection.end();
});


describe("POST /sign-in", () => {
    it("returns status 200 for valid params",async () => {
        const body = {
            email: 'testee@gmail.com',
            password: '12345'      
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(200);
    });
    it("returns status 401 for invalid password",async () => {
        const body = {
            email: 'testee@gmail.com',
            password: '1234566666'      
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(401);
    });
    it("returns status 401 for invalid email",async () => {
        const body = {
            email: 'testqwqe@gmail.com',
            password: '1234566666'      
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(401);
    });
    it("returns status 400 for empty email value",async () => {
        const body = {
            email: '',
            password: '123'      
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(400);
    });
    it("returns status 400 for empty password value",async () => {
        const body = {
            email: 'testee@gmail.com',
            password: ''      
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(400);
    });
    it("returns status 400 when email was not sent",async () => {
        const body = {

            password: ''      
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(400);
    });
    it("returns status 400 when password was not sent",async () => {
        const body = {
            email: 'testee@gmail.com'
                
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(400);
    });
    it("returns status 400 when password value is less than 2 characters",async () => {
        const body = {
            email: 'testee@gmail.com',
            password:'12'
                
          };
        const result =await supertest(app).post("/sign-in").send(body);
    expect(result.status).toEqual(400);
    });
}); 