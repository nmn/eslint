/**
 * @fileoverview Rule to require newlines before `return` statement
 * @author Kai Cataldo
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "require an empty line before `return` statements",
            category: "Stylistic Issues",
            recommended: false
        },

        schema: []
    },

    create: function(context) {
        var sourceCode = context.getSourceCode();

        //--------------------------------------------------------------------------
        // Helpers
        //--------------------------------------------------------------------------

        /**
         * Tests whether node is preceded by supplied tokens
         * @param {ASTNode} node - node to check
         * @param {array} testTokens - array of tokens to test against
         * @returns {boolean} Whether or not the node is preceded by one of the supplied tokens
         * @private
         */
        function isPrecededByTokens(node, testTokens) {
            var tokenBefore = sourceCode.getTokenBefore(node);

            return testTokens.some(function(token) {
                return tokenBefore.value === token;
            });
        }

        /**
         * Checks whether node is the first node after statement or in block
         * @param {ASTNode} node - node to check
         * @returns {boolean} Whether or not the node is the first node after statement or in block
         * @private
         */
        function isFirstNode(node) {
            var parentType = node.parent.type;

            if (node.parent.body) {
                return Array.isArray(node.parent.body)
                  ? node.parent.body[0] === node
                  : node.parent.body === node;
            }

            if (parentType === "IfStatement") {
                return isPrecededByTokens(node, ["else", ")"]);
            } else if (parentType === "DoWhileStatement") {
                return isPrecededByTokens(node, ["do"]);
            } else if (parentType === "SwitchCase") {
                return isPrecededByTokens(node, [":"]);
            } else {
                return isPrecededByTokens(node, [")"]);
            }
        }

        /**
         * Returns the number of lines of comments that precede the node
         * @param {ASTNode} node - node to check for overlapping comments
         * @param {number} lineNumTokenBefore - line number of previous token, to check for overlapping comments
         * @returns {number} Number of lines of comments that precede the node
         * @private
         */
        function calcCommentLines(node, lineNumTokenBefore) {
            var comments = sourceCode.getComments(node).leading,
                numLinesComments = 0;

            if (!comments.length) {
                return numLinesComments;
            }

            comments.forEach(function(comment) {
                numLinesComments++;

                if (comment.type === "Block") {
                    numLinesComments += comment.loc.end.line - comment.loc.start.line;
                }

                // avoid counting lines with inline comments twice
                if (comment.loc.start.line === lineNumTokenBefore) {
                    numLinesComments--;
                }

                if (comment.loc.end.line === node.loc.start.line) {
                    numLinesComments--;
                }
            });

            return numLinesComments;
        }

        /**
         * Checks whether node is preceded by a newline
         * @param {ASTNode} node - node to check
         * @returns {boolean} Whether or not the node is preceded by a newline
         * @private
         */
        function hasNewlineBefore(node) {
            var tokenBefore = sourceCode.getTokenBefore(node),
                lineNumNode = node.loc.start.line,
                lineNumTokenBefore,
                commentLines;

            /**
             * Global return (at the beginning of a script) is a special case.
             * If there is no token before `return`, then we expect no line
             * break before the return. Comments are allowed to occupy lines
             * before the global return, just no blank lines.
             * Setting lineNumTokenBefore to zero in that case results in the
             * desired behavior.
             */
            if (tokenBefore) {
                lineNumTokenBefore = tokenBefore.loc.end.line;
            } else {
                lineNumTokenBefore = 0;     // global return at beginning of script
            }

            commentLines = calcCommentLines(node, lineNumTokenBefore);

            return (lineNumNode - lineNumTokenBefore - commentLines) > 1;
        }

        /**
         * Reports expected/unexpected newline before return statement
         * @param {ASTNode} node - the node to report in the event of an error
         * @param {boolean} isExpected - whether the newline is expected or not
         * @returns {void}
         * @private
         */
        function reportError(node, isExpected) {
            var expected = isExpected ? "Expected" : "Unexpected";

            context.report({
                node: node,
                message: expected + " newline before return statement."
            });
        }

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        return {
            ReturnStatement: function(node) {
                if (isFirstNode(node) && hasNewlineBefore(node)) {
                    reportError(node, false);
                } else if (!isFirstNode(node) && !hasNewlineBefore(node)) {
                    reportError(node, true);
                }
            }
        };
    }
};
