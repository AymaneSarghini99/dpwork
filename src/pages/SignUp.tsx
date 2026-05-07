import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { signUp, resendConfirmationEmail } from '@/lib/auth'
import { toast } from 'sonner'

const SignUp = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      await signUp(email, password)
      toast.success('Account created', {
        description: 'Please check your email to verify your account.',
        action: {
          label: 'Resend Email',
          onClick: () => {
            resendConfirmationEmail(email).then(() => {
              toast.success('Confirmation email resent')
            }).catch(() => {
              toast.error('Failed to resend email')
            })
          }
        }
      })
    } catch (error: any) {
      console.error('Error signing up:', error)
      toast.error('Failed to create account', {
        description: error.message || 'Please try again later.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-6">
          <h1 className="text-xs md:text-sm text-spaced text-muted-foreground font-light">
            DEEP WORK
          </h1>
          
          <div className="space-y-3">
            <h2 className="text-lg font-light text-foreground">
              Create account
            </h2>
            <p className="text-xs text-muted-foreground/70">
              Start your focused work journey
            </p>
          </div>
        </div>

        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-full border border-white/10 bg-white/[0.04] text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus-visible:border-white/20 focus-visible:ring-0 transition-colors"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full px-4 py-3 rounded-full border border-white/10 bg-white/[0.04] text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus-visible:border-white/20 focus-visible:ring-0 transition-colors pr-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full glass flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Eye className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 rounded-full border border-white/10 bg-white/[0.04] text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground/40 focus-visible:border-white/20 focus-visible:ring-0 transition-colors pr-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full glass flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Eye className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass rounded-full px-6 py-4 flex items-center justify-center gap-3 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            <span className="text-xs tracking-[0.3em] font-medium">
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </span>
          </button>
        </form>

        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-transparent text-muted-foreground/50">OR</span>
            </div>
          </div>

          <button className="w-full glass rounded-full px-6 py-4 flex items-center justify-center gap-3 hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02]">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-xs tracking-[0.3em] font-medium">
              CONTINUE WITH GOOGLE
            </span>
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/50">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-foreground hover:text-foreground/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default SignUp
