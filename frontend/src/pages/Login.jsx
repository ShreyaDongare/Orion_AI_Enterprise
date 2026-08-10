import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '../components/Input';
import Button from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid business email address'),

  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const navigate = useNavigate();

  const {
    login,
    isLoading,
    error,
  } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: 'test@example.com',
      password: 'password123',
    },
  });

  const onSubmit = async (data) => {
    const success = await login(data);

    if (success) {
      toast.success('Welcome back to OrionAI Enterprise!');

      navigate('/dashboard', {
        replace: true,
      });

      return;
    }

    toast.error(
      error || 'Login failed. Please check your credentials.'
    );
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-100 rounded-full blur-3xl opacity-50" />
      </div>

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.98,
          y: 10,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: 0.3,
        }}
        className="
          relative
          z-10
          w-full
          max-w-md
          bg-white
          p-8
          rounded-2xl
          border
          border-slate-200
          shadow-md
          space-y-6
        "
      >

        {/* Logo / Header */}
        <div className="flex flex-col items-center">

          <div className="
            w-12
            h-12
            rounded-xl
            bg-blue-600
            flex
            items-center
            justify-center
            mb-4
          ">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <h1 className="
            text-2xl
            font-semibold
            tracking-tight
            text-slate-900
          ">
            OrionAI Enterprise
          </h1>

          <p className="
            mt-2
            text-sm
            text-slate-500
            text-center
          ">
            Sign in to your autonomous AI workspace
          </p>

        </div>

        {/* Real backend error */}
        {error && (
          <div className="
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-700
          ">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >

          {/* Email */}
          <Input
            id="login-email-input"
            label="Business Email"
            type="email"
            icon={Mail}
            placeholder="test@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          {/* Password */}
          <Input
            id="login-password-input"
            label="Password"
            type="password"
            icon={Lock}
            placeholder="••••••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Remember / Forgot */}
          <div className="
            flex
            items-center
            justify-between
            text-xs
            text-slate-600
          ">

            <label className="
              flex
              items-center
              gap-2
              cursor-pointer
            ">
              <input
                type="checkbox"
                className="
                  rounded
                  border-slate-300
                  text-blue-600
                  focus:ring-blue-500
                "
              />

              <span>
                Remember this device
              </span>
            </label>

            <Link
              to="/forgot-password"
              className="
                text-blue-600
                hover:underline
                font-medium
              "
            >
              Forgot password?
            </Link>

          </div>

          {/* Login button */}
          <Button
            id="login-submit-button"
            type="submit"
            variant="blue"
            size="lg"
            isLoading={isLoading}
            className="w-full justify-center"
            icon={ArrowRight}
            iconPosition="right"
          >
            Sign In to Enterprise Workspace
          </Button>

        </form>

        {/* Register */}
        <div className="
          pt-4
          border-t
          border-slate-100
          flex
          items-center
          justify-between
          text-xs
          text-slate-500
          font-medium
        ">
          <span>
            Don't have an enterprise account?
          </span>

          <Link
            to="/register"
            className="
              text-blue-600
              hover:underline
              font-bold
            "
          >
            Create Account
          </Link>
        </div>

        {/* Security */}
        <div className="
          flex
          items-center
          justify-center
          gap-2
          text-[10px]
          text-slate-400
          font-mono
          pt-2
        ">
          <ShieldCheck
            className="w-3.5 h-3.5 text-emerald-600"
          />

          <span>
            Secure JWT Authentication
          </span>
        </div>

      </motion.div>
    </div>
  );
}