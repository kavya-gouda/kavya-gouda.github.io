import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowSquareOut, GithubLogo, Envelope, LinkedinLogo, ArrowLeft } from '@phosphor-icons/react'

interface Project {
  id: string
  title: string
  description: string
  longDescription: string
  technologies: string[]
  demoUrl?: string
  githubUrl?: string
  imageUrl?: string
}

interface Article {
  id: string
  title: string
  description: string
  url: string
  publishedAt: string
  readTime: string
}

const projects: Project[] = [
  {
    id: 'project-1',
    title: 'E-commerce Platform',
    description: 'A full-stack e-commerce solution with React and Node.js',
    longDescription: 'A comprehensive e-commerce platform built with modern web technologies. Features include user authentication, product catalog, shopping cart, payment integration with Stripe, order management, and admin dashboard. The application uses React for the frontend, Node.js/Express for the backend, and PostgreSQL for data persistence.',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Tailwind CSS'],
    demoUrl: 'https://example-ecommerce.com',
    githubUrl: 'https://github.com/yourusername/ecommerce-platform'
  },
  {
    id: 'project-2',
    title: 'Task Management App',
    description: 'A collaborative task management tool with real-time updates',
    longDescription: 'A real-time collaborative task management application that helps teams organize and track their work. Built with React and Socket.io for real-time updates, featuring drag-and-drop task boards, team collaboration, file attachments, and detailed analytics. The backend uses Express.js with MongoDB for data storage.',
    technologies: ['React', 'Socket.io', 'MongoDB', 'Express.js', 'Material-UI'],
    demoUrl: 'https://example-tasks.com',
    githubUrl: 'https://github.com/yourusername/task-manager'
  },
  {
    id: 'project-3',
    title: 'Weather Analytics Dashboard',
    description: 'Data visualization dashboard for weather patterns',
    longDescription: 'An interactive weather analytics dashboard that visualizes weather patterns and trends using historical data. Built with React and D3.js for data visualization, the application displays charts, maps, and statistical analysis of weather data. It integrates with multiple weather APIs and provides forecasting capabilities.',
    technologies: ['React', 'D3.js', 'Python', 'FastAPI', 'Chart.js'],
    demoUrl: 'https://example-weather.com',
    githubUrl: 'https://github.com/yourusername/weather-dashboard'
  }
]

const articles: Article[] = [
  {
    id: 'article-1',
    title: 'Building Scalable React Applications',
    description: 'Best practices for structuring and scaling React applications',
    url: 'https://medium.com/@yourusername/building-scalable-react-applications',
    publishedAt: '2024-01-15',
    readTime: '8 min read'
  },
  {
    id: 'article-2',
    title: 'The Future of Web Development',
    description: 'Exploring emerging trends and technologies in web development',
    url: 'https://medium.com/@yourusername/future-of-web-development',
    publishedAt: '2023-12-08',
    readTime: '6 min read'
  },
  {
    id: 'article-3',
    title: 'Optimizing Database Performance',
    description: 'Techniques for improving database query performance and scalability',
    url: 'https://medium.com/@yourusername/optimizing-database-performance',
    publishedAt: '2023-11-22',
    readTime: '10 min read'
  }
]

function App() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState('about')

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setActiveTab('project-detail')
  }

  const handleBackToProjects = () => {
    setSelectedProject(null)
    setActiveTab('projects')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">John Doe</h1>
          <p className="text-xl text-muted-foreground mb-6">Full-Stack Developer & Technical Writer</p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:john@example.com" target="_blank" rel="noopener noreferrer">
                <Envelope className="w-4 h-4 mr-2" />
                Email
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://linkedin.com/in/johndoe" target="_blank" rel="noopener noreferrer">
                <LinkedinLogo className="w-4 h-4 mr-2" />
                LinkedIn
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://github.com/johndoe" target="_blank" rel="noopener noreferrer">
                <GithubLogo className="w-4 h-4 mr-2" />
                GitHub
              </a>
            </Button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            {selectedProject && (
              <TabsTrigger value="project-detail" className="hidden">Project Detail</TabsTrigger>
            )}
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About Me</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  I'm a passionate full-stack developer with 5+ years of experience building scalable web applications. 
                  I specialize in React, Node.js, and cloud technologies, with a focus on creating user-centered solutions 
                  that solve real-world problems.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  When I'm not coding, I enjoy writing technical articles on Medium, contributing to open-source projects, 
                  and mentoring junior developers. I believe in continuous learning and staying up-to-date with the latest 
                  technology trends.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker', 'Git'].map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {project.technologies.map((tech) => (
                        <Badge key={tech} variant="outline" className="text-xs">{tech}</Badge>
                      ))}
                    </div>
                    <Button 
                      onClick={() => handleProjectClick(project)}
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Project Detail Tab */}
          <TabsContent value="project-detail" className="space-y-6">
            {selectedProject && (
              <div>
                <Button 
                  variant="outline" 
                  onClick={handleBackToProjects}
                  className="mb-6"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Projects
                </Button>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">{selectedProject.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedProject.longDescription}
                    </p>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Technologies Used</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary">{tech}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {selectedProject.demoUrl && (
                        <Button asChild>
                          <a href={selectedProject.demoUrl} target="_blank" rel="noopener noreferrer">
                            <ArrowSquareOut className="w-4 h-4 mr-2" />
                            Live Demo
                          </a>
                        </Button>
                      )}
                      {selectedProject.githubUrl && (
                        <Button variant="outline" asChild>
                          <a href={selectedProject.githubUrl} target="_blank" rel="noopener noreferrer">
                            <GithubLogo className="w-4 h-4 mr-2" />
                            Source Code
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {articles.map((article) => (
                <Card key={article.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      <span>{article.readTime}</span>
                    </div>
                    <Button asChild className="w-full">
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        <ArrowSquareOut className="w-4 h-4 mr-2" />
                        Read on Medium
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Get In Touch</CardTitle>
                <CardDescription>
                  I'm always interested in new opportunities and collaborations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Button size="lg" asChild>
                    <a href="mailto:john@example.com">
                      <Envelope className="w-5 h-5 mr-2" />
                      Send Email
                    </a>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <a href="https://linkedin.com/in/johndoe" target="_blank" rel="noopener noreferrer">
                      <LinkedinLogo className="w-5 h-5 mr-2" />
                      Connect on LinkedIn
                    </a>
                  </Button>
                </div>
                <p className="text-muted-foreground text-center">
                  Available for freelance projects and full-time opportunities.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App