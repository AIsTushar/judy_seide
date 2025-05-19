import express, { Request, Response } from 'express';
import router from './routes/routes';
import globalErrorHandler from './middlewares/globalErrorHandler';
import cors from 'cors';
import NotFound from './middlewares/NotFound';

const app = express();

export const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://localhost:5174',
  ],

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

//middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', router);
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use(globalErrorHandler);

//test route
const test = async (req: Request, res: Response) => {
  const sayHi = 'Welcome to Judy Seide Server';
  res.send(sayHi);
};
app.get('/', test);
//gloabal err handler
app.use(globalErrorHandler);

//Not Found Route
app.use(NotFound);

export default app;
