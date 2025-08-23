import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSearch = () => {
    // Focus global search if available
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    } else {
      navigate('/app/chat');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <FileQuestion className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-4xl font-bold text-foreground mb-2">
            404
          </CardTitle>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. 
            The page might have been moved, deleted, or you entered the wrong URL.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Suggestions */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What you can do:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Check the URL for typos</li>
              <li>• Go back to the previous page</li>
              <li>• Visit our homepage</li>
              <li>• Use the search function</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
            <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Button variant="outline" onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          {/* Popular Links */}
          <div className="text-center">
            <h3 className="font-semibold mb-3">Popular Pages</h3>
            <div className="flex flex-wrap justify-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/app/chat')}
                className="text-blue-600 hover:text-blue-700"
              >
                Chat
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/app/portfolio')}
                className="text-blue-600 hover:text-blue-700"
              >
                Portfolio
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/app/settings')}
                className="text-blue-600 hover:text-blue-700"
              >
                Settings
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>
              Still having trouble? Contact support or try using the search function.
            </p>
            <p className="mt-1">
              Error Code: 404 • Page Not Found
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotFound;