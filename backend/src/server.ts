import app from './app';
import { config } from './config/config';
import { checkConnection, initializeDatabase, databaseType } from './config/database';
import { adminService } from './services/adminService';

const PORT = config.PORT || 5000;

// Test database connection
async function testDatabaseConnection() {
  try {
    const isConnected = await checkConnection();
    if (isConnected) {
      console.log(`✅ ${databaseType} database connected successfully`);
      return true;
    } else {
      console.error(`❌ ${databaseType} database connection failed`);
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize system health monitoring
async function initializeSystemHealth() {
  try {
    await adminService.updateSystemHealth(
      'system',
      'HEALTHY',
      null,
      null,
      {
        cpuUsage: process.cpuUsage().user / 1000000,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        uptime: process.uptime(),
        activeConnections: 0,
        lastChecked: new Date()
      }
    );
    console.log('✅ System health monitoring initialized');
  } catch (error) {
    console.error('⚠️ Failed to initialize system health monitoring:', error);
  }
}

// Periodic system health updates
function startHealthMonitoring() {
  setInterval(async () => {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      await adminService.updateSystemHealth(
        'system',
        'HEALTHY',
        null,
        null,
        {
          cpuUsage: cpuUsage.user / 1000000,
          memoryUsage: memUsage.heapUsed / 1024 / 1024,
          uptime: process.uptime(),
          activeConnections: 0,
          lastChecked: new Date()
        }
      );
    } catch (error) {
      console.error('Error updating system health:', error);
    }
  }, 60000); // Update every minute
}

// Periodic metrics generation
function startMetricsGeneration() {
  // Generate metrics every hour
  setInterval(async () => {
    try {
      await adminService.generateMetrics();
      console.log('📊 Metrics generated successfully');
    } catch (error) {
      console.error('Error generating metrics:', error);
    }
  }, 60 * 60 * 1000); // Every hour
}

// Periodic cleanup
function startPeriodicCleanup() {
  // Clean up old data daily at 2 AM
  const now = new Date();
  const tomorrow2AM = new Date(now);
  tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
  tomorrow2AM.setHours(2, 0, 0, 0);
  
  const msUntil2AM = tomorrow2AM.getTime() - now.getTime();
  
  setTimeout(() => {
    // Run cleanup immediately, then every 24 hours
    const runCleanup = async () => {
      try {
        await adminService.cleanupOldData(90); // Keep 90 days of data
        console.log('🧹 Periodic cleanup completed');
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    };
    
    runCleanup();
    setInterval(runCleanup, 24 * 60 * 60 * 1000); // Every 24 hours
  }, msUntil2AM);
}

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Financial Advisory Platform API...');
    console.log('📍 Environment:', config.NODE_ENV);
    console.log('🔧 Node.js version:', process.version);
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error('❌ Cannot start server without database connection');
      process.exit(1);
    }
    
    // Initialize database (create tables, seed data)
    await initializeDatabase();
    
    // Initialize system monitoring
    await initializeSystemHealth();
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📚 API documentation available at: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check available at: http://localhost:${PORT}/api/health`);
      
      if (config.NODE_ENV === 'development') {
        console.log('🔧 Development mode - Enhanced logging enabled');
        console.log('🔓 CORS configured for local development');
      }
    });
    
    // Start background processes
    startHealthMonitoring();
    startMetricsGeneration();
    startPeriodicCleanup();
    
    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received, starting graceful shutdown...`);
      
      server.close(async (err) => {
        if (err) {
          console.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('🔄 HTTP server closed');
        
        try {
          // Update system health to indicate shutdown
          await adminService.updateSystemHealth({
            status: 'MAINTENANCE',
            cpuUsage: 0,
            memoryUsage: 0,
            uptime: 0,
            activeConnections: 0,
            lastChecked: new Date()
          });
          
          // Close database connections
          await pool.end();
          console.log('🔄 Database connections closed');
          
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('⚠️ Forced shutdown after 30 seconds');
        process.exit(1);
      }, 30000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      
      try {
        // Log critical error to admin notifications
        await adminService.createNotification({
          title: 'Critical Server Error',
          message: `Uncaught exception: ${error.message}`,
          type: 'ERROR',
          priority: 'CRITICAL'
        });
      } catch (logError) {
        console.error('Failed to log critical error:', logError);
      }
      
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      
      try {
        // Log critical error to admin notifications
        await adminService.createNotification({
          title: 'Unhandled Promise Rejection',
          message: `Unhandled rejection: ${reason}`,
          type: 'ERROR',
          priority: 'HIGH'
        });
      } catch (logError) {
        console.error('Failed to log unhandled rejection:', logError);
      }
      
      // Don't exit on unhandled rejections in production
      if (config.NODE_ENV !== 'production') {
        gracefulShutdown('UNHANDLED_REJECTION');
      }
    });
    
    // Log successful startup
    try {
      await adminService.createNotification(
        'SUCCESS',
        'Server Started',
        `Financial Advisory Platform API started successfully on port ${PORT}`,
        { priority: 'LOW' }
      );
    } catch (error) {
      console.error('Failed to log server startup:', error);
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();