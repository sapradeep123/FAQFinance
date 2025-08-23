"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFound = NotFound;
const react_1 = __importDefault(require("react"));
const card_1 = require("../components/ui/card");
const button_1 = require("../components/ui/button");
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
function NotFound() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const handleGoHome = () => {
        navigate('/');
    };
    const handleGoBack = () => {
        navigate(-1);
    };
    const handleSearch = () => {
        const searchInput = document.querySelector('[data-search-input]');
        if (searchInput) {
            searchInput.focus();
        }
        else {
            navigate('/app/chat');
        }
    };
    return (<div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <card_1.Card className="w-full max-w-2xl">
        <card_1.CardHeader className="text-center">
          <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <lucide_react_1.FileQuestion className="h-12 w-12 text-blue-600"/>
          </div>
          <card_1.CardTitle className="text-4xl font-bold text-foreground mb-2">
            404
          </card_1.CardTitle>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. 
            The page might have been moved, deleted, or you entered the wrong URL.
          </p>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-6">
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What you can do:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Check the URL for typos</li>
              <li>• Go back to the previous page</li>
              <li>• Visit our homepage</li>
              <li>• Use the search function</li>
            </ul>
          </div>

          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button_1.Button onClick={handleGoHome} className="flex items-center gap-2">
              <lucide_react_1.Home className="h-4 w-4"/>
              Go Home
            </button_1.Button>
            <button_1.Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
              <lucide_react_1.ArrowLeft className="h-4 w-4"/>
              Go Back
            </button_1.Button>
            <button_1.Button variant="outline" onClick={handleSearch} className="flex items-center gap-2">
              <lucide_react_1.Search className="h-4 w-4"/>
              Search
            </button_1.Button>
          </div>

          
          <div className="text-center">
            <h3 className="font-semibold mb-3">Popular Pages</h3>
            <div className="flex flex-wrap justify-center gap-2">
              <button_1.Button variant="ghost" size="sm" onClick={() => navigate('/app/chat')} className="text-blue-600 hover:text-blue-700">
                Chat
              </button_1.Button>
              <button_1.Button variant="ghost" size="sm" onClick={() => navigate('/app/portfolio')} className="text-blue-600 hover:text-blue-700">
                Portfolio
              </button_1.Button>
              <button_1.Button variant="ghost" size="sm" onClick={() => navigate('/app/settings')} className="text-blue-600 hover:text-blue-700">
                Settings
              </button_1.Button>
            </div>
          </div>

          
          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>
              Still having trouble? Contact support or try using the search function.
            </p>
            <p className="mt-1">
              Error Code: 404 • Page Not Found
            </p>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
exports.default = NotFound;
//# sourceMappingURL=NotFound.js.map