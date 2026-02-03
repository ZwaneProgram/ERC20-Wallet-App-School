Gone Token

A modern web application for managing ERC-20 tokens on the Ethereum Sepolia testnet. This application allows users to register, connect their MetaMask wallets, generate receive-only wallets, send tokens, and track transaction history.

Features
- **User Authentication**: Secure registration and login system with JWT tokens
- **Wallet Integration**: Connect MetaMask wallets using Wagmi
- **Wallet Generation**: Generate receive-only Ethereum wallets
- **Token Transfers**: 
  - Admin mode: Send tokens from a server-controlled wallet
  - User mode: Send tokens directly from connected MetaMask wallet
- **Transaction History**: View both admin and user transaction history
- **Token Balance**: Check token balances for connected wallets
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS

Tech Stack
- **Framework**: Next.js 16.1.6 (App Router)
- **Frontend**: React 19.2.3
- **Web3**: Wagmi 3.4.2, Viem 2.45.1, Ethers.js 6.16.0
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (jsonwebtoken)
- **Styling**: Tailwind CSS 4
- **State Management**: TanStack React Query

Prerequisites
Before you begin, ensure you have the following installed:
- Node.js 18+ and npm
- PostgreSQL database
- MetaMask browser extension (for wallet connection)
- An Ethereum Sepolia testnet RPC endpoint
- An ERC-20 token contract deployed on Sepolia

Installation
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd school-crypto-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/school_crypto?schema=public"
   
   # Authentication
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   
   # Blockchain
   SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
   CONTRACT_ADDRESS="0xYourTokenContractAddress"
   NEXT_PUBLIC_CONTRACT_ADDRESS="0xYourTokenContractAddress"
   ADMIN_PRIVATE_KEY="0xYourAdminWalletPrivateKey"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

Database Schema
### User
- `id`: Unique identifier
- `email`: User email (unique)
- `password`: Hashed password
- `connectedWallet`: Linked MetaMask wallet address
- `walletLinkedAt`: Timestamp of wallet linking
- `createdAt`: Account creation timestamp

### Wallet
- `id`: Unique identifier
- `address`: Ethereum wallet address (unique)
- `privateKey`: Encrypted private key
- `userId`: Foreign key to User
- `createdAt`: Wallet creation timestamp

### Transaction
- `id`: Unique identifier
- `from`: Sender address
- `to`: Recipient address
- `amount`: Token amount
- `txHash`: Blockchain transaction hash (unique)
- `status`: Transaction status (success/failed)
- `type`: Transaction type (admin/user)
- `userId`: Foreign key to User
- `createdAt`: Transaction timestamp

API Endpoints
### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Wallet
- `POST /api/wallet/generate` - Generate a new wallet
- `GET /api/wallet/list` - List user's wallets

### Token
- `POST /api/token/send` - Send tokens (admin mode)
- `POST /api/token/send-user` - Send tokens (user mode)
- `GET /api/token/balance` - Get token balance

### Transaction
- `GET /api/transaction/history` - Get user transaction history
- `GET /api/transaction/admin-history` - Get admin transaction history

Usage
Registering a New User
1. Navigate to `/register`
2. Enter your email and password
3. Click "Register"

Connecting MetaMask
1. Log in to your account
2. On the dashboard, click "Connect MetaMask"
3. Approve the connection in MetaMask
4. Your wallet will be automatically linked to your account

Generating Wallets
1. On the dashboard, click "Generate New" in the Generated Wallets section
2. A new receive-only wallet will be created
3. Copy the address to receive tokens

Sending Tokens (Admin Mode)
1. Fill in the recipient address
2. Enter the amount of tokens to send
3. Click "Send from Admin Wallet"
4. Transaction will be executed from the server-controlled wallet

Sending Tokens (User Mode)
1. Connect your MetaMask wallet
2. Fill in the recipient address
3. Enter the amount of tokens to send
4. Click "Send My Tokens"
5. Approve the transaction in MetaMask

Security Considerations
- **Private Keys**: Admin private keys should be stored securely and never exposed
- **JWT Secret**: Use a strong, random JWT secret in production
- **Database**: Use environment variables for database credentials
- **HTTPS**: Always use HTTPS in production
- **Rate Limiting**: Consider implementing rate limiting for API endpoints
- **Input Validation**: Validate all user inputs on both client and server

Testing
The application is configured for the Sepolia testnet. Make sure you:
- Have Sepolia ETH in your admin wallet for gas fees
- Use test tokens on Sepolia
- Test all functionality before deploying to mainnet

Deployment
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

Environment Variables for Production
Ensure all environment variables are set in your production environment:
- `DATABASE_URL`
- `JWT_SECRET`
- `SEPOLIA_RPC_URL`
- `CONTRACT_ADDRESS`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `ADMIN_PRIVATE_KEY`

Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

License
This project is open source and available under the MIT License.

Disclaimer
This application is for educational purposes. Always exercise caution when dealing with cryptocurrency and smart contracts. Never share your private keys or commit them to version control.