"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaqSidebar = FaqSidebar;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const button_1 = require("../ui/button");
const useChatStore_1 = require("../../stores/useChatStore");
const use_toast_1 = require("../../hooks/use-toast");
const cn_1 = require("../../lib/cn");
const faqData = [
    {
        id: 'banking',
        name: 'Banking',
        icon: '🏦',
        faqs: [
            {
                id: 'bank-1',
                question: 'How do I open a savings account?',
                answer: 'To open a savings account, you typically need to provide identification, proof of address, and an initial deposit. Visit your preferred bank branch or apply online through their website.'
            },
            {
                id: 'bank-2',
                question: 'What are the different types of checking accounts?',
                answer: 'Common checking account types include basic checking (low fees, basic features), premium checking (higher fees, more benefits), student checking (designed for students), and senior checking (for older adults).'
            },
            {
                id: 'bank-3',
                question: 'How do wire transfers work?',
                answer: 'Wire transfers are electronic money transfers between banks. They require the recipient\'s bank routing number, account number, and name. Domestic wires typically process same-day, while international wires may take 1-5 business days.'
            }
        ]
    },
    {
        id: 'loans',
        name: 'Loans',
        icon: '💰',
        faqs: [
            {
                id: 'loan-1',
                question: 'What factors affect my loan approval?',
                answer: 'Key factors include your credit score, income stability, debt-to-income ratio, employment history, and the loan amount relative to collateral value (for secured loans).'
            },
            {
                id: 'loan-2',
                question: 'What\'s the difference between fixed and variable interest rates?',
                answer: 'Fixed rates remain constant throughout the loan term, providing predictable payments. Variable rates fluctuate with market conditions, potentially offering lower initial rates but with payment uncertainty.'
            },
            {
                id: 'loan-3',
                question: 'How do I improve my chances of loan approval?',
                answer: 'Improve your credit score, reduce existing debt, maintain stable employment, save for a larger down payment, and consider a co-signer if needed.'
            }
        ]
    },
    {
        id: 'investments',
        name: 'Investments',
        icon: '📈',
        faqs: [
            {
                id: 'invest-1',
                question: 'What\'s the difference between stocks and bonds?',
                answer: 'Stocks represent ownership in companies and offer potential for higher returns but with more risk. Bonds are loans to companies or governments, typically offering lower but more stable returns.'
            },
            {
                id: 'invest-2',
                question: 'How much should I invest in my 401(k)?',
                answer: 'Aim to contribute at least enough to get your full employer match. Financial experts often recommend contributing 10-15% of your income to retirement accounts, including 401(k) and IRA contributions.'
            },
            {
                id: 'invest-3',
                question: 'What is dollar-cost averaging?',
                answer: 'Dollar-cost averaging involves investing a fixed amount regularly regardless of market conditions. This strategy can help reduce the impact of market volatility and remove emotion from investment decisions.'
            },
            {
                id: 'invest-4',
                question: 'Should I invest in individual stocks or mutual funds?',
                answer: 'Mutual funds offer instant diversification and professional management, making them suitable for beginners. Individual stocks require more research and carry higher risk but offer potential for higher returns.'
            }
        ]
    },
    {
        id: 'tax',
        name: 'Tax',
        icon: '📋',
        faqs: [
            {
                id: 'tax-1',
                question: 'What tax deductions can I claim?',
                answer: 'Common deductions include mortgage interest, charitable donations, state and local taxes (up to $10,000), medical expenses exceeding 7.5% of AGI, and business expenses for self-employed individuals.'
            },
            {
                id: 'tax-2',
                question: 'When should I itemize vs. take the standard deduction?',
                answer: 'Itemize when your total deductions exceed the standard deduction ($13,850 for single filers, $27,700 for married filing jointly in 2023). Calculate both to determine which saves more money.'
            },
            {
                id: 'tax-3',
                question: 'How do tax brackets work?',
                answer: 'Tax brackets are progressive - you pay different rates on different portions of income. For example, if you\'re in the 22% bracket, you don\'t pay 22% on all income, only on the amount within that bracket range.'
            }
        ]
    },
    {
        id: 'cards',
        name: 'Cards',
        icon: '💳',
        faqs: [
            {
                id: 'card-1',
                question: 'How do I build credit with a credit card?',
                answer: 'Use your card regularly for small purchases, pay the full balance on time each month, keep utilization below 30% of your limit, and avoid closing old accounts to maintain credit history length.'
            },
            {
                id: 'card-2',
                question: 'What\'s the difference between credit and debit cards?',
                answer: 'Credit cards borrow money from the issuer (must be repaid), offer fraud protection and rewards, and help build credit. Debit cards use your own money directly from your bank account.'
            },
            {
                id: 'card-3',
                question: 'How do credit card rewards work?',
                answer: 'Rewards cards offer points, miles, or cash back on purchases. Categories may include groceries, gas, dining, or general purchases. Rewards can be redeemed for travel, statement credits, or merchandise.'
            }
        ]
    }
];
function FaqSidebar() {
    const [expandedCategories, setExpandedCategories] = (0, react_1.useState)(['banking']);
    const { activeThreadId, sendMessage, createNewThread } = (0, useChatStore_1.useChatStore)();
    const { toast } = (0, use_toast_1.useToast)();
    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => prev.includes(categoryId)
            ? prev.filter(id => id !== categoryId)
            : [...prev, categoryId]);
    };
    const handleFaqClick = async (faq) => {
        try {
            let threadId = activeThreadId;
            if (!threadId) {
                threadId = await createNewThread(`FAQ: ${faq.question.slice(0, 30)}...`);
            }
            const faqContent = `**FAQ Question:** ${faq.question}\n\n**Answer:** ${faq.answer}\n\n---\n\nFeel free to ask any follow-up questions about this topic!`;
            await sendMessage(threadId, faqContent);
            toast({
                title: 'FAQ Added',
                description: 'The FAQ has been added to your current conversation.'
            });
        }
        catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to add FAQ to conversation.',
                variant: 'destructive'
            });
        }
    };
    return (<div className="h-full flex flex-col">
      
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <lucide_react_1.HelpCircle className="h-5 w-5 text-primary"/>
          <h2 className="font-semibold text-foreground">Finance FAQ</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Click any question to add it to your chat
        </p>
      </div>

      
      <div className="flex-1 overflow-y-auto p-2">
        {faqData.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            return (<div key={category.id} className="mb-2">
              
              <button_1.Button variant="ghost" className="w-full justify-start p-2 h-auto" onClick={() => toggleCategory(category.id)}>
                <div className="flex items-center gap-2 w-full">
                  {isExpanded ? (<lucide_react_1.ChevronDown className="h-4 w-4"/>) : (<lucide_react_1.ChevronRight className="h-4 w-4"/>)}
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium">{category.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {category.faqs.length}
                  </span>
                </div>
              </button_1.Button>

              
              {isExpanded && (<div className="ml-6 mt-1 space-y-1">
                  {category.faqs.map((faq) => (<button_1.Button key={faq.id} variant="ghost" className={(0, cn_1.cn)("w-full justify-start p-2 h-auto text-left", "hover:bg-accent hover:text-accent-foreground", "text-sm text-muted-foreground hover:text-foreground")} onClick={() => handleFaqClick(faq)}>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"/>
                        <span className="text-left leading-relaxed">
                          {faq.question}
                        </span>
                      </div>
                    </button_1.Button>))}
                </div>)}
            </div>);
        })}
      </div>
    </div>);
}
//# sourceMappingURL=FaqSidebar.js.map