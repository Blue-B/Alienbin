require('dotenv').config();

const express =require('express')
const app = express()
const port = process.env.PORT
app.set('view engine', 'ejs')

app.use(express.static('public'))
app.use(express.urlencoded({extended:true}))

const { ObjectId } = require('mongodb')  /* findOne( { _id : ObjectId('611e61ee9eee')} ) */
const { MongoClient } = require('mongodb')
let db
const url = process.env.DB_URL //db url
new MongoClient(url).connect().then((client)=>{
    console.log('DB연결성공')
    db = client.db('bin')
  }).catch((err)=>{
    console.log(err)
  })


app.get('/', (req,res)=>{
    res.render("new")
})


app.post('/save', async (req,res)=>{
    const value = req.body.value
    const ttlOption = req.body.ttlOption
    const createdAt = new Date() // 현재 시간을 생성합니다.
    let result

    const indexInfo = await db.collection('post').indexInformation()
        if (indexInfo.createdAt_1) {
            await db.collection('post').dropIndex("createdAt_1")
        }

    try{
        if (ttlOption === '30s'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 30 })
            result = await db.collection('post').insertOne({ value, createdAt }) 
        } 
        else if (ttlOption === '1m'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 60 }) 
            result = await db.collection('post').insertOne({ value, createdAt }) 
        } 
        else if (ttlOption === '10m'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 600 }) 
            result = await db.collection('post').insertOne({ value, createdAt }) 
        } 
        else if (ttlOption === '30m'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 1800 }) 
            result = await db.collection('post').insertOne({ value, createdAt }) 
        } 
        else if (ttlOption === '1h'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 3600 }) 
            result = await db.collection('post').insertOne({ value, createdAt })
        } 
        else if (ttlOption === '3h'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 10800 })
            result = await db.collection('post').insertOne({ value, createdAt })
        } 
        else if (ttlOption === '1day'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 }) 
            result = await db.collection('post').insertOne({ value, createdAt }) 
        } 
        else if (ttlOption === '7day'){
            await db.collection('post').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 604800 }) 
            result = await db.collection('post').insertOne({ value, createdAt }) 
        } 
        else{ //영원히
            result = await db.collection('post').insertOne({ value })
        }
        res.redirect(`/display/${result.insertedId}`) //결과반환
  
    }catch(e){
        res.render("new",{ value })
    }
})


app.get('/display/:id', async (req,res)=>{
    try{
        const id = req.params.id
        const post = await db.collection('post').findOne({_id:new ObjectId(id)})
        const document = `${post.value}`
        res.render('display', { code : document})
    }
    catch(e){
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'})
        res.write("<script>alert('페이지가 존재하지 않습니다'); window.location.href = '/';</script>")

    }
})

app.get('/about', (req,res)=>{
    res.render('about',)
})


app.listen(port, ()=>{
    console.log("서버가열렸습니다",port);
})