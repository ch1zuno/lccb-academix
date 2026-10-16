import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  BookOpen, User, Lock, Loader2, ArrowRight, GraduationCap, 
  Users, Target, BookMarked, ChevronRight, X, Sparkles, 
  ShieldCheck, TrendingUp, Calendar, CheckCircle2, Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

const VALID_USERS = {
  '20-1102': 'tutor',
  '22-0941': 'learner'
};

const ARTICLES = [
  { id: 1, category: 'Study Tips', title: 'Top 5 Study Habits for IT Students', date: 'Sept 25, 2026', readTime: '5 min read', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80' },
  { id: 2, category: 'Success Story', title: 'How Peer Tutoring Boosts Confidence', date: 'Sept 20, 2026', readTime: '3 min read', img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80' },
  { id: 3, category: 'Platform News', title: 'LCCB Academix Reaches 500 Sessions!', date: 'Sept 15, 2026', readTime: '2 min read', img: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80' },
];

export default function LandingPage({ onLogin }) {
  const [showLogin, setShowLogin] = useState(false);
  const [loginRole, setLoginRole] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openLogin = (role) => {
    setLoginRole(role);
    setShowLogin(true);
    setError('');
    setSchoolId(role === 'tutor' ? '20-1102' : '22-0941'); 
    setPassword('password123');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    
    if (!schoolId || !password) {
      setError('Please enter your School ID and password.');
      return;
    }

    const role = VALID_USERS[schoolId.trim()];
    
    if (!role || role !== loginRole) {
      setError(`Invalid credentials for ${loginRole}.`);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(role);
    }, 1500);
  };

  // Animation Variants
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-primary/20 selection:text-primary">
      {/* Navbar */}
      <motion.header 
        className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm py-3' : 'bg-transparent py-5'}`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-2xl tracking-tight text-primary">
            <div className="bg-primary text-white p-1.5 rounded-lg shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            LCCB Academix
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
            <a href="#vision" className="hover:text-primary transition-colors">Vision</a>
            <a href="#articles" className="hover:text-primary transition-colors">Articles</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden sm:flex text-slate-600 hover:text-primary font-semibold" onClick={() => openLogin('learner')}>
              Student Login
            </Button>
            <Button className="rounded-full shadow-lg shadow-primary/20 font-bold px-6" onClick={() => openLogin('tutor')}>
              Tutor Portal
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Hero Content */}
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={staggerContainer}
              className="max-w-2xl"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-semibold text-slate-600 mb-6">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span>The Official Peer Tutoring Platform of LCCB</span>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
                Master your subjects <br className="hidden lg:block" />
                with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Peer Learning.</span>
              </motion.h1>
              
              <motion.p variants={fadeUp} className="text-lg lg:text-xl text-slate-600 mb-8 leading-relaxed max-w-lg">
                Connect with verified, top-performing student tutors. Get the help you need, exactly when you need it, and achieve your academic goals together.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25" onClick={() => openLogin('learner')}>
                  Find a Tutor <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full bg-white hover:bg-slate-50" onClick={() => openLogin('tutor')}>
                  Apply as Tutor
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-10 flex items-center gap-6 text-sm font-medium text-slate-500">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Student" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-secondary mb-0.5">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p>Trusted by 500+ LCCB Students</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Image / Visuals */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative lg:ml-auto"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-white w-full max-w-lg mx-auto">
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" 
                  alt="Students studying together" 
                  className="w-full aspect-[4/5] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                
                {/* Overlay Text */}
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">Session Completed</p>
                        <p className="text-xs text-white/80">Intro to Programming</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Stat Card */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }} 
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }} 
                className="absolute -right-6 top-1/4 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 z-20"
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-2xl text-slate-900">98%</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
            {[
              { label: 'Active Students', value: '500+' },
              { label: 'Certified Tutors', value: '45+' },
              { label: 'Subjects Covered', value: '24' },
              { label: 'Hours Tutored', value: '1,200+' },
            ].map((stat, i) => (
              <div key={i} className="text-center px-4">
                <p className="text-3xl lg:text-4xl font-extrabold text-primary mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How Academix Works</h2>
            <p className="text-lg text-slate-600">A seamless process designed to get you the academic support you need quickly and securely.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-200 -z-10" />
            
            {[
              { icon: Search, title: '1. Request a Session', desc: 'Tell us what subject you need help with and your availability.' },
              { icon: Users, title: '2. Get Matched', desc: 'Our algorithm pairs you with a verified, top-performing student tutor.' },
              { icon: GraduationCap, title: '3. Learn & Grow', desc: 'Meet in-person at the library or online. Improve your grades together.' },
            ].map((step, i) => (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                key={i} 
                className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section id="vision" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-slate-50 -skew-x-12 translate-x-20 -z-10" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Our Core Philosophy</h2>
              <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                Guided by the values of La Consolacion College Bacolod, we strive for academic excellence through community support and shared responsibility.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Our Vision</h3>
                    <p className="text-slate-600 leading-relaxed">A collaborative and thriving academic community where every student has the peer guidance needed to excel in their chosen fields.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Our Mission</h3>
                    <p className="text-slate-600 leading-relaxed">To provide an accessible, high-quality peer tutoring platform that connects struggling students with verified, top-performing peers.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80" alt="Students" className="rounded-2xl w-full h-64 object-cover mt-12 shadow-lg" />
                <img src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80" alt="Library" className="rounded-2xl w-full h-64 object-cover shadow-lg" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-2xl pointer-events-none mix-blend-overlay" />
            </div>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section id="articles" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Latest Campus Articles</h2>
              <p className="text-lg text-slate-600">Tips, news, and success stories from the LCCB Academix community.</p>
            </div>
            <Button variant="outline" className="shrink-0 bg-white hover:bg-slate-50">
              View All Articles <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {ARTICLES.map((article, i) => (
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { delay: i * 0.1 } } }}
                key={article.id} 
              >
                <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-none bg-white overflow-hidden h-full flex flex-col">
                  <div className="h-52 bg-slate-200 overflow-hidden relative">
                    <img 
                      src={article.img} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      alt={article.title}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                        {article.category}
                      </span>
                    </div>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-3">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {article.date}</span>
                      <span className="flex items-center gap-1.5"><BookMarked className="w-3.5 h-3.5" /> {article.readTime}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors leading-snug mb-4">
                      {article.title}
                    </h3>
                    <div className="mt-auto flex items-center text-primary font-semibold text-sm group-hover:gap-2 transition-all">
                      Read Article <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2000&q=80')] opacity-10 mix-blend-overlay bg-cover bg-center" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Ready to improve your grades?</h2>
          <p className="text-primary-foreground/80 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
            Join hundreds of LCCB students who are already learning together. Registration is free for all officially enrolled students.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold" onClick={() => openLogin('learner')}>
              Find a Tutor Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2 font-bold text-xl text-white mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
              LCCB Academix
            </div>
            <p className="text-sm max-w-sm leading-relaxed mb-6">
              The official peer tutoring platform of La Consolacion College Bacolod. Empowering students through collaborative learning.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Find a Tutor</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Become a Tutor</a></li>
              <li><a href="#" className="hover:text-white transition-colors">How it Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Rewards Catalog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Guidelines</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact IT Dept</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 La Consolacion College Bacolod. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowLogin(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md"
            >
              <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
                <div className={`h-2 w-full ${loginRole === 'tutor' ? 'bg-secondary' : 'bg-primary'}`} />
                <CardContent className="p-8 bg-white">
                  <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-full" onClick={() => setShowLogin(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                  
                  <div className="text-center mb-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${loginRole === 'tutor' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                      {loginRole === 'tutor' ? <GraduationCap className="w-8 h-8" /> : <Users className="w-8 h-8" />}
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900">
                      {loginRole === 'tutor' ? 'Tutor Portal' : 'Student Login'}
                    </h2>
                    <p className="text-slate-500 mt-1.5 text-sm font-medium">Please enter your LCCB credentials.</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl text-center border border-red-100">
                            {error}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">School ID Number</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                        <Input 
                          placeholder="e.g. 22-0941" 
                          className="pl-11 bg-slate-50 border-slate-200 h-12 text-lg focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                          value={schoolId}
                          onChange={(e) => setSchoolId(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                        <a href="#" className="text-xs font-semibold text-primary hover:underline">Forgot?</a>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          className="pl-11 bg-slate-50 border-slate-200 h-12 text-lg focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className={`w-full h-12 text-lg font-bold shadow-lg transition-all ${loginRole === 'tutor' ? 'bg-secondary hover:bg-secondary/90 shadow-secondary/20 text-secondary-foreground' : 'shadow-primary/20'}`} 
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                    </Button>
                  </form>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Testing Credentials</p>
                    <div className="inline-flex flex-col gap-1 items-center bg-slate-50 px-4 py-2 rounded-lg border border-slate-100 text-xs text-slate-600">
                      <span>ID: <strong className="text-slate-900 font-mono text-sm">{loginRole === 'tutor' ? '20-1102' : '22-0941'}</strong></span>
                      <span>Password: <strong className="text-slate-900 font-mono text-sm">any</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Custom Star component since it wasn't imported from lucide-react in the previous iteration
function Star({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
