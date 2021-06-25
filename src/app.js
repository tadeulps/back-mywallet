import express from 'express';
import cors from 'cors';
import pg from "pg";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import dayjs from "dayjs"
import Joi from "joi";
import connection from "./databaseConfig.js"

pg.types.setTypeParser(1082, (str) => str);

const app = express();
app.use(cors());
app.use(express.json());



app.get("/teste", (req,res)=>{
  res.sendStatus(200)
})

app.post("/sign-up", async (req, res) => {
    const { name, email, password,secPassword } = req.body;
    const schema=Joi.object({
      name:Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(3).required(),
      secPassword: Joi.string().min(3).required(),
    });
    if(password!==secPassword){
      res.sendStatus(400);return
  }
    const {error}=schema.validate({name, email, password,secPassword});
    if(error){
        res.sendStatus(400); return
    }
    try{
    const result=await connection.query(`SELECT * FROM users
    WHERE email=$1`,[email])
    if(result.rows.length>0){
      res.sendStatus(409); return
    }
    
    const passwordHash = bcrypt.hashSync(password, 10);
    await connection.query(`
    INSERT INTO users
    (name, email, password)
    VALUES ($1, $2, $3)
`,[name, email, passwordHash]);
    res.sendStatus(201);
  }catch{
        res.sendStatus(500);
    }
});

app.post("/sign-in", async (req, res) => {
    const { email, password } = req.body;
    const schema=Joi.object({ 
      email: Joi.string().email().required(),
      password: Joi.string().min(3).required()
    });
    const {error}=schema.validate({email,password});
    if(error){
        res.sendStatus(400); return
    }
    try{
    
    const result=await connection.query(`SELECT * FROM users WHERE email=$1`,[email]);
    const user=result.rows[0];
    if(user && bcrypt.compareSync(password,user.password)) {
        const token = uuidv4();
        
        await connection.query(`
          INSERT INTO sessions ("userId", token)
          VALUES ($1, $2)
        `, [user.id, token]);
        res.send({token}).status(200)
    } else {
        res.sendStatus(401);
    }}catch{
        res.sendStatus(500);
    }
});

app.get("/user-infos",async(req,res)=>{
    const authorization = req.headers['authorization'];
    const token = authorization?.replace('Bearer ', '');
    if(!token) return res.sendStatus(400);
    try{
    const result = await connection.query(`
    SELECT users.*
    FROM sessions
    JOIN users
    ON sessions."userId" = users.id
    WHERE sessions.token = $1
  `, [token]);
  const user = result.rows[0];

  if(user) {
    const transactions=await connection.query(`
    select tipo,valor,data,descricao from transactions 
    where "idPessoa"=$1`,[result.rows[0].id])
    delete user.password
    user.transactions=transactions.rows
    res.send(user)
  } else {
    res.sendStatus(400);
  }}catch(erro){
      res.sendStatus(500)
      console.log(erro)
  }
})

app.post("/add",async(req,res)=>{
    const authorization = req.headers['authorization'];
    const transactionDay=dayjs().format('DD/MM');
    const token = authorization?.replace('Bearer ', '');
    if(!token) return res.sendStatus(400);
    const valor=req.body.valor;
    const descricao=req.body.descricao;
    const schema=Joi.object({ 
      descricao: Joi.string().max(50).required(),
      valor: Joi.number().min(1).max(1000000).required()
    });
    const {error}=schema.validate({descricao,valor});
    if(error){
        res.sendStatus(400); return
    }
    const tipo='entrada'
    try{
    const result = await connection.query(`
    SELECT users.* FROM sessions
    JOIN users
    ON sessions."userId" = users.id
    WHERE sessions.token = $1
  `, [token]);
    const userId = result.rows[0].id;
    if(userId) {
        await connection.query(`INSERT INTO transactions 
        ("idPessoa",tipo,valor,data,descricao)
         VALUES($1,$2,$3,$4,$5)`,[userId,tipo,valor,transactionDay,descricao])
         res.sendStatus(200)
      } else {
        res.sendStatus(400);
      }
    }catch(erro){
        res.sendStatus(500)
        console.log(erro)
    }
})

app.post("/withdraw",async(req,res)=>{
    const authorization = req.headers['authorization'];
    const transactionDay=dayjs().format('DD/MM');
    const token = authorization?.replace('Bearer ', '');
    if(!token) return res.sendStatus(400);
    const valor=req.body.valor;
    const descricao=req.body.descricao;
    const schema=Joi.object({ 
      descricao: Joi.string().max(50).required(),
      valor: Joi.number().min(1).max(1000000).required()
    });
    const {error}=schema.validate({descricao,valor});
    if(error){
        res.sendStatus(400); return
    }
    const tipo='saida'
    try{
    const result = await connection.query(`
    SELECT users.* FROM sessions
    JOIN users
    ON sessions."userId" = users.id
    WHERE sessions.token = $1
  `, [token]);
    const userId = result.rows[0].id;
    if(userId) {
        await connection.query(`INSERT INTO transactions 
        ("idPessoa",tipo,valor,data,descricao)
         VALUES($1,$2,$3,$4,$5)`,[userId,tipo,valor,transactionDay,descricao])
         res.sendStatus(200)
      } else {
        res.sendStatus(400);
      }
    }catch(erro){
        res.sendStatus(500)
        console.log(erro)
    }
})

app.delete("/logout",async (req,res)=>{
  const authorization = req.headers['authorization'];
  const token = authorization?.replace('Bearer ', '');
  if(!token) return res.sendStatus(400);
  try{
  const result =await connection.query(`SELECT * FROM 
    sessions WHERE token=$1`,[token])
  if(result.rows.length===0){
    return res.sendStatus(404);
  }
  await connection.query(`DELETE FROM sessions 
  WHERE token=$1`,[token])
  res.sendStatus(200)}
  catch(err){
    res.send(err)
  }
})
export default app;