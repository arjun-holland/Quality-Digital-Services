require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { UserModel, AgentModel } = require('./config');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();


//convert data into json format
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render('main');
});
app.get("/login", async (req, res) => {
    res.render('login');
});


// JWT authentication middleware
function authenticateToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
        return wantsJSON
            ? res.status(401).json({ message: 'Authentication required' })
            : res.redirect('/login');
    }

    jwt.verify(token, "your_jwt_secret", (err, user) => {
        if (err) {
            const wantsJSON = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);
            return wantsJSON
                ? res.status(401).json({ message: 'Invalid or expired token' })
                : res.redirect('/login');
        }

        req.user = user;
        next();
    });
}



// Public routes (no auth required)
app.get("/main", async (req, res) => {
    res.render('main');
});
app.get("/careerneeds", async (req, res) => {
    res.render('mcareer');
});
app.get("/aboutneeds", async (req, res) => {
    res.render('mabout');
});
app.get("/login", async (req, res) => {
    res.render('login');
});
app.get("/user-login", async (req, res) => {
    res.render('user-login');
});
app.get("/agents-login", async (req, res) => {
    res.render('agents-login');
});
app.get("/signup", async (req, res) => {
    res.render('signup');
});
app.get("/user-signup", async (req, res) => {
    res.render('user-signup');
});
app.get("/agents-signup", async (req, res) => {
    res.render('agents-signup');
});
app.get("/careerneed",async (req,res)=>{
    res.render('career');
});
app.get("/aboutneed",async (req,res)=>{
    res.render('about');
});
app.get("/buypremium", (req, res) => {
    const whatsappLink = "https://api.whatsapp.com/send?phone=917382752900&text=Hello%20Quality%20Digital%20Services%2C%20Im%20Intrested%20as%20an%20Agent%2C%20Provide%20me%20the%20Login%20Credentials.";
    res.redirect(whatsappLink);
});

//Registration
app.post("/signup", async (req, res) => {
    const data = {
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
        mobile: req.body.mobile
    };
    console.log(data);
    try {
        //check if user already exist
        const existUser = await UserModel.findOne({ email: data.email });
        if (existUser) {
            // Redirect with error query
            return res.redirect("/signup?error=exists");
        }
        //hash the password
        const saltRounds = 10;//number of salt rounnd for bcrypt
        const hashPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashPassword;
        await UserModel.insertMany(data);
        // Redirect with success toast

        res.render("login", { message: "signup successfully completed!" });
    } catch (error) {
        console.error("Signup Error:", error.message);
        res.redirect("/signup?error=server");
    }
});

//user login

app.post("/loginIn", async (req, res) => {
    const data = {
        email: req.body.email,
        password: req.body.password
    };
    console.log(data);
    try {
        // Check if the user exists
        const user = await UserModel.findOne({ email: data.email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        // Compare password
        const isMatch = await bcrypt.compare(data.password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        // Generate JWT
        const token = jwt.sign({ id: user._id, email: user.email }, "your_jwt_secret", { expiresIn: '1h' });

        // Set JWT in cookie with appropriate options
        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'Lax', // If you are deploying, change this to 'None'
            secure: false    // If you are deploying to HTTPS, make this true
        });

        console.log("Login successful!");
        return res.status(200).json({ message: "Login successful!" });

    } catch (error) {
        console.error("Login Error:", error.message);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

// app.get("/dashboard", (req, res) => {
//     res.render("dashboard"); // dashboard.ejs must exist in /views folder
// });

//agent login
app.post("/loginAgent", async (req, res) => {
    try {
        const { agentId, password } = req.body;
        const check = await AgentModel.findOne({ agentId });

        if (!check) {
            return res.status(404).json({ message: "AgentID not found" });
        }

        if (check.password === password) {
            // ✅ Generate JWT using agent info
            const token = jwt.sign(
                { id: check._id, agentId: check.agentId },
                "your_jwt_secret",
                { expiresIn: '1h' }
            );

            // ✅ Set JWT in cookie
            res.cookie('token', token, {
                httpOnly: true,
                sameSite: 'Lax',
                secure: process.env.NODE_ENV === 'production'  // true if using HTTPS
            });
            return res.status(200).json({ message: "Login successful" });
        } else {
            return res.status(401).json({ message: "Wrong password" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Something went wrong" });
    }
});
app.get("/changepasswordneed",(req,res)=>{
    res.render('changepassword');
});
app.post('/changeneed', async (req, res) => {
    const obj = {   agentId:req.body.agentId,
        oldPassword:req.body.oldPassword,
        newPassword:req.body.newPassword,
        confirmPassword:req.body.confirmPassword,
    };
    
    try {
        const agent = await AgentModel.findOne({agentId:obj.agentId});
        if (!agent) {
            return res.status(404).send("Agent not found");
        }
        if (agent.password !== obj.oldPassword) {
            return res.status(401).send("Old password is incorrect");
        }
        if (obj.newPassword !== obj.confirmPassword) {
            return res.status(400).send("New password and confirm password do not match");
        }
        if (obj.newPassword.length < 6) {
            return res.status(400).send("Password must be at least 6 characters long");
        }
        agent.password = obj.newPassword;
        await agent.save();
        res.send("Password changed successfully");
    } catch (err) {
        console.error(err);
        res.status(500).send("Something went wrong");
    }
});
app.get("/logoutneed", (req, res) => {
    res.clearCookie("token"); // Remove the JWT cookie
    res.redirect('main');   // Redirect to login page (or homepage if you prefer)
});


// Protect all routes below this line
app.use(authenticateToken);


app.get("/getLoan", async (req, res) => {
    res.render('loan');
});
app.get('/loansneed', (req, res) => {
    res.render('loan');
});
app.get('/goldloanneed', (req, res) => {
    res.render('goldloan');
});
app.get("/dashboard", (req, res) => {
    res.render("dashboard"); // dashboard.ejs must exist in /views folder
});
app.get('/bankaccountneed', (req, res) => {
    res.render('bankaccount');
});
app.get('/creditneed', (req, res) => {
    res.render('creditcards');
});
app.get('/mutualfundsneed', (req, res) => {
    res.render('mutualfunds');
});
app.get('/bookingneed', (req, res) => {
    res.render('booking');
});
app.get('/demataccountneed', (req, res) => {
    res.render('demataccount');
});
app.get('/signupneed', (req, res) => {
    res.render('signup');
});


//demat account
app.get("/openWithLoginneed", (req, res) => {
    res.render('openLogin');   // Redirect to login page (or homepage if you prefer)
});
app.get("/openWithOutLoginneed", (req, res) => {
    res.render('openWithOutLogin');   // Redirect to login page (or homepage if you prefer)
});

//Personal lones
app.get("/openLoginLH",(req,res)=>{
    res.render('openLoginLH');
});
app.get("/openwithLoginLH",(req,res)=>{
    res.render('openWithOutLoginLH');
});
app.get("/openLoginLU",(req,res)=>{
    res.render('openLoginLU');
});
app.get("/openwithLoginLU",(req,res)=>{
    res.render('openWithOutLoginLU');
});
app.get("/openLoginLA",(req,res)=>{
    res.render('openLoginLA');
});
app.get("/openWithLoginLA",(req,res)=>{
    res.render('openWithLoginLA');
});
app.get("/openLoginLB",(req,res)=>{
    res.render('openLoginLB');
});
app.get("/openWithOutLoginLB",(req,res)=>{
    res.render('openWithOutLoginLB');
});
app.get("/openLoginLAX",(req,res)=>{
    res.render('openLoginLAX');
});
app.get("/openwithLoginLAX",(req,res)=>{
    res.render('openWithOutLoginLAX');
});
//Loans
app.get("/openLLB",(req,res)=>{
    res.render('openLLB');
});
app.get("/openWLLB",(req,res)=>{
    res.render('openWLLB');
});
app.get("/openLLC",(req,res)=>{
    res.render('openLLC');
});
app.get("/openWLLC",(req,res)=>{
    res.render('openWLLC');
});
app.get("/openLLCh",(req,res)=>{
    res.render('openLLCh');
});
app.get("/openWLLCh",(req,res)=>{
    res.render('openWLLCh');
});
app.get("/openLLF",(req,res)=>{
    res.render('openLLF');
});
app.get("/openWLLF",(req,res)=>{
    res.render('openWLLF');
});
app.get("/openLLFu",(req,res)=>{
    res.render('openLLFu');
});
app.get("/openWLLFu",(req,res)=>{
    res.render('openWLLFu');
});
app.get("/openLLI",(req,res)=>{
    res.render('openLLI');
});
app.get("/openWLLI",(req,res)=>{
    res.render('openWLLI');
});
app.get("/openLLIn",(req,res)=>{
    res.render('openLLIn');
});
app.get("/openWLLIn",(req,res)=>{
    res.render('openWLLIn');
});
app.get("/openLLIc",(req,res)=>{
    res.render('openLLIc');
});
app.get("/openWLLIc",(req,res)=>{
    res.render('openWLLIc');
});
app.get("/openLLId",(req,res)=>{
    res.render('openLLId');
});
app.get("/openWLLId",(req,res)=>{
    res.render('openWLLId');
});
app.get("/openLLK",(req,res)=>{
    res.render('openLLK');
});
app.get("/openWLLK",(req,res)=>{
    res.render('openWLLK');
});
app.get("/openLLP",(req,res)=>{
    res.render('openLLP');
});
app.get("/openWLLP",(req,res)=>{
    res.render('openWLLP');
});
app.get("/openLLPo",(req,res)=>{
    res.render('openLLPo');
});
app.get("/openWLLPo",(req,res)=>{
    res.render('openWLLPo');
});
app.get("/openLLPi",(req,res)=>{
    res.render('openLLPi');
});
app.get("/openWLLPi",(req,res)=>{
    res.render('openWLLPi');
});
app.get("/openLLY",(req,res)=>{
    res.render('openLLY');
});
app.get("/openWLLY",(req,res)=>{
    res.render('openWLLY');
});
app.get("/openLLT",(req,res)=>{
    res.render('openLLT');
});
app.get("/openWLLT",(req,res)=>{
    res.render('openWLLT');
});
app.get("/openLLN",(req,res)=>{
    res.render('openLLN');
});
app.get("/openWLLN",(req,res)=>{
    res.render('openWLLN');
});



//gold loan
app.get("/openLG",(req,res)=>{
    res.render('openLG');
});
app.get("/openWLG",(req,res)=>{
    res.render('openWLG');
});

//booking
app.get("/openLBG",(req,res)=>{
    res.render('openLBG');
});
app.get("/openWLBG",(req,res)=>{
    res.render('openWLBG');
});
app.get("/openLBM",(req,res)=>{
    res.render('openLBM');
});
app.get("/openWLBM",(req,res)=>{
    res.render('openWLBM');
});
app.get("/openLBE",(req,res)=>{
    res.render('openLBE');
});
app.get("/openWLBE",(req,res)=>{
    res.render('openWLBE');
});
app.get("/openLBH",(req,res)=>{
    res.render('openLBH');
});
app.get("/openWLBH",(req,res)=>{
    res.render('openWLBH');
});
app.get("/openLBT",(req,res)=>{
    res.render('openLBT');
});
app.get("/openWLBT",(req,res)=>{
    res.render('openWLBT');
});
app.get("/openLBI",(req,res)=>{
    res.render('openLBI');
});
app.get("/openWLBI",(req,res)=>{
    res.render('openWLBI');
});

//mutuals
app.get("/openLMC",(req,res)=>{
    res.render('openLMC');
});
app.get("/openWLMC",(req,res)=>{
    res.render('openWLMC');
});
app.get("/openLMS",(req,res)=>{
    res.render('openLMS');
});
app.get("/openWLMS",(req,res)=>{
    res.render('openWLMS');
});

//Bank Accounts(BA)
app.get("/openLBAA",(req,res)=>{
    res.render('openLBAA');
});
app.get("/openWLBAA",(req,res)=>{
    res.render('openWLBAA');
});
app.get("/openLBAY",(req,res)=>{
    res.render('openLBAY');
});
app.get("/openWLBAA",(req,res)=>{
    res.render('openWLBAA');
});
app.get("/openLBAI",(req,res)=>{
    res.render('openLBAI');
});
app.get("/openWLBAI",(req,res)=>{
    res.render('openWLBAI');
});
app.get("/openLBAAx",(req,res)=>{//axis
    res.render('openLBAAx');
});
app.get("/openWLBAAx",(req,res)=>{
    res.render('openWLBAAx');
});
app.get("/openLBAT",(req,res)=>{
    res.render('openLBAT');
});
app.get("/openWLBAT",(req,res)=>{
    res.render('openWLBAT');
});
//credit cards
app.get("/openLCS",(req,res)=>{//SBI
    res.render('openLCS');
});
app.get("/openWLCS",(req,res)=>{
    res.render('openWLCS');
});
app.get("/openLCH",(req,res)=>{//HBFC
    res.render('openLCH');
});
app.get("/openWLCH",(req,res)=>{
    res.render('openWLCH');
});
app.get("/openLCP",(req,res)=>{//pop
    res.render('openLCP');
});
app.get("/openWLCP",(req,res)=>{
    res.render('openWLCP');
});
app.get("/openLCA",(req,res)=>{//AU
    res.render('openLCA');
});
app.get("/openWLCA",(req,res)=>{
    res.render('openWLCA');
});
app.get("/openLCI",(req,res)=>{//IDFC
    res.render('openLCI');
});
app.get("/openWLCI",(req,res)=>{
    res.render('openWLCI');
});
app.get("/openLCSI",(req,res)=>{//sbi irtc
    res.render('openLCSI');
});
app.get("/openWLCSI",(req,res)=>{
    res.render('openWLCSI');
});
app.get("/openLCSS",(req,res)=>{//sbi simply
    res.render('openLCSS');
});
app.get("/openWLCSS",(req,res)=>{
    res.render('openWLCSS');
});
app.get("/openLCIF",(req,res)=>{//idfc first
    res.render('openLCIF');
});
app.get("/openWLCIF",(req,res)=>{
    res.render('openWLCIF');
});
app.get("/openLCIC",(req,res)=>{//icic
    res.render('openLCIC');
});
app.get("/openWLCIC",(req,res)=>{
    res.render('openWLCIC');
});
app.get("/openLCIn",(req,res)=>{//indused bank
    res.render('openLCIn');
});
app.get("/openWLCIn",(req,res)=>{
    res.render('openWLCIn');
});
app.get("/openLCR",(req,res)=>{//rbl credit card
    res.render('openLCR');
});
app.get("/openWLCR",(req,res)=>{
    res.render('openWLCR');
});
app.get("/openLChSbc",(req,res)=>{//hsbc
    res.render('openLChSbc');
});
app.get("/openWLChSbc",(req,res)=>{
    res.render('openWLChSbc');
});
app.get("/openLCSC",(req,res)=>{//standard charted
    res.render('openLCSC');
});
app.get("/openWLCSC",(req,res)=>{
    res.render('openWLCSC');
});
app.get("/openLChT",(req,res)=>{//HDFC TATA
    res.render('openLhT');
});
app.get("/openWLChT",(req,res)=>{
    res.render('openWLChT');
});
app.get("/openLChR",(req,res)=>{//HDFC rupay
    res.render('openLChR');
});
app.get("/openWLChR",(req,res)=>{
    res.render('openWLChR');
});
app.get("/openLChI",(req,res)=>{//HDFC IRCTC
    res.render('openLChI');
});
app.get("/openWLChI",(req,res)=>{
    res.render('openWLChI');
});
app.get("/openLChS",(req,res)=>{//HDFC Swigy
    res.render('openLChS');
});
app.get("/openWLChS",(req,res)=>{
    res.render('openWLChS');
});
app.get("/openLCaM",(req,res)=>{//axis myzone
    res.render('openLCaM');
});
app.get("/openWLCaM",(req,res)=>{
    res.render('openWLCaM');
});
app.get("/openLCtnf",(req,res)=>{//tata neu FD
    res.render('openLCtnf');
});
app.get("/openWLCtnf",(req,res)=>{
    res.render('openWLCtnf');
});
app.get("/openLCaF",(req,res)=>{//axis flipkart
    res.render('openLCaF');
});
app.get("/openWLCaF",(req,res)=>{
    res.render('openWLCaF');
});
app.get("/openLCaR",(req,res)=>{//axis reward 
    res.render('openLCaR');
});
app.get("/openWLCaR",(req,res)=>{
    res.render('openWLCaR');
});
app.get("/openLCN",(req,res)=>{//naovio
    res.render('openLCN');
});
app.get("/openWLCN",(req,res)=>{
    res.render('openWLCN');
});
app.get("/openLCAMR",(req,res)=>{//axis myzone Rupay
    res.render('openLCAMR');
});
app.get("/openWLCAMR",(req,res)=>{
    res.render('openWLCAMR');
});
app.get("/openLCAIO",(req,res)=>{//axis indian oil
    res.render('openLCAIO');
});
app.get("/openWLCAIO",(req,res)=>{
    res.render('openWLCAIO');
});
app.get("/openLChB",(req,res)=>{//HDFC bonvoy
    res.render('openLChB');
});
app.get("/openWLChB",(req,res)=>{
    res.render('openWLChB');
});
app.get("/openLCT",(req,res)=>{//Tide
    res.render('openLCT');
});
app.get("/openWLCT",(req,res)=>{
    res.render('openWLCT');
});
app.get("/openLCsss",(req,res)=>{//sbi simple safe
    res.render('openLCsss');
});
app.get("/openWLCsss",(req,res)=>{
    res.render('openWLCsss');
});

//add here authentication routes

// ...existing code...


const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});
