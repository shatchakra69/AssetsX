import 'package:flutter/material.dart';
import 'package:assets_x/main.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  // Controllers for text fields
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  // Toggle between sign in and sign up
  bool _isSignIn = true;
  bool _obscurePassword = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131315),
      appBar: AppBar(
        backgroundColor: const Color(0xFF131315),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Color(0xFFE4E2E4)),
          onPressed: () {
            Navigator.pop(context);
          },
        ),
        title: const Text(
          'AssetsX',
          style: TextStyle(
            color: Color(0xFFE4E2E4),
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 24),

            // Logo image asset
            Image.asset(
              'images/appstore.png',
              width: 80,
              height: 80,
              fit: BoxFit.contain,
            ),

            const SizedBox(height: 16),

            // Title
            const Text(
              'AssetsX.',
              style: TextStyle(
                color: Color(0xFFE4E2E4),
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.8,
              ),
            ),

            const SizedBox(height: 8),

            // Subtitle
            Text(
              _isSignIn
                  ? 'Welcome back.\nSign in to your account'
                  : 'Create your account.\nStart tracking markets.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFFC5C6CD),
                fontSize: 16,
                height: 1.5,
              ),
            ),

            const SizedBox(height: 32),

            // Email field
            TextField(
              controller: _emailController,
              style: const TextStyle(color: Color(0xFFE4E2E4)),
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                hintText: 'Email',
                hintStyle: const TextStyle(
                  color: Color(0x66C5C6CD),
                ),
                prefixIcon: const Icon(
                  Icons.mail_outline,
                  color: Color(0xFFC5C6CD),
                ),
                filled: true,
                fillColor: const Color(0xFF1F1F21),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: Color(0xFF44474D),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: Color(0xFF44474D),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: Color(0xFFB9C7E4),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Password field
            TextField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              style: const TextStyle(color: Color(0xFFE4E2E4)),
              decoration: InputDecoration(
                hintText: 'Password',
                hintStyle: const TextStyle(
                  color: Color(0x66C5C6CD),
                ),
                prefixIcon: const Icon(
                  Icons.lock_outline,
                  color: Color(0xFFC5C6CD),
                ),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_off_outlined
                        : Icons.visibility_outlined,
                    color: const Color(0xFFC5C6CD),
                  ),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
                filled: true,
                fillColor: const Color(0xFF1F1F21),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: Color(0xFF44474D),
                  ),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: Color(0xFF44474D),
                  ),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(
                    color: Color(0xFFB9C7E4),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Forgot password
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {},
                child: const Text(
                  'Forgot password?',
                  style: TextStyle(
                    color: Color(0xFFB9C7E4),
                    fontSize: 14,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 8),

            // Login button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Please enter email and password'),
                        backgroundColor: Color(0xFF1F1F21),
                      ),
                    );
                    return;
                  }
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (context) => MainScreen(userEmail: _emailController.text),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFB9C7E4),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: Text(
                  _isSignIn ? 'Login' : 'Create Account',
                  style: const TextStyle(
                    color: Color(0xFF233148),
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Divider
            const Row(
              children: [
                Expanded(child: Divider(color: Color(0xFF44474D))),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    'Or login with',
                    style: TextStyle(
                      color: Color(0xFF8F9097),
                      fontSize: 14,
                    ),
                  ),
                ),
                Expanded(child: Divider(color: Color(0xFF44474D))),
              ],
            ),

            const SizedBox(height: 24),

            // FaceID button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF44474D)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                label: const Text(
                  'Continue with Apple',
                  style: TextStyle(
                    color: Color(0xFFE4E2E4),
                    fontSize: 16,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Toggle sign in / sign up
            GestureDetector(
              onTap: () {
                setState(() {
                  _isSignIn = !_isSignIn;
                });
              },
              child: RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: _isSignIn
                          ? "Don't have an account? "
                          : 'Already have an account? ',
                      style: const TextStyle(
                        color: Color(0xFFC5C6CD),
                        fontSize: 14,
                      ),
                    ),
                    TextSpan(
                      text: _isSignIn ? 'Sign Up' : 'Sign In',
                      style: const TextStyle(
                        color: Color(0xFFB9C7E4),
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}